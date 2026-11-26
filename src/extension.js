import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const PREFIX = 'appindicator-';

export default class TrayOverflow extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._rightBox = Main.panel._rightBox;
        this._moved = new Map();      // container -> {index}
        this._destroyIds = new Map(); // container -> signal id
        this._busy = false;

        this._button = new PanelMenu.Button(0.5, 'Tray Overflow', false);
        this._button.add_child(new St.Label({
            text: '⋯', y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-icon',
        }));

        // gaveta NA BARRA (não dentro de um popup): assim o menu de cada ícone
        // abre pelo menuManager do painel sem fechar nada
        this._row = new St.BoxLayout({visible: false, reactive: true, track_hover: true});
        this._closeId = 0;
        this._pinMenu = new PopupMenu.PopupSubMenuMenuItem('Fixar na barra');
        this._button.menu.addMenuItem(this._pinMenu);
        this._button.menu.connectObject('open-state-changed', (_m, open) => {
            if (open) this._rebuildPinMenu();
        }, this);

        Main.panel.addToStatusArea('tray-overflow', this._button, 0, 'right');
        this._busy = true;
        this._rightBox.insert_child_below(this._row, this._button.container);
        this._busy = false;

        // clique esquerdo abre/fecha a gaveta; direito abre o menu "Fixar na barra"
        this._button.connectObject('event', (_a, ev) => {
            const t = ev.type();
            if (t === Clutter.EventType.BUTTON_PRESS && ev.get_button() === 1) {
                this._button.menu.close();
                this._row.visible = !this._row.visible;
                if (this._row.visible) this._armClose();
                return Clutter.EVENT_STOP;
            }
            if (t === Clutter.EventType.BUTTON_RELEASE && ev.get_button() === 1)
                return Clutter.EVENT_STOP;
            return Clutter.EVENT_PROPAGATE;
        }, this);

        this._rightBox.connectObject('child-added', () => {
            if (this._busy) return;
            // statusArea já está preenchido quando o container entra na box
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => { this._sync(); return GLib.SOURCE_REMOVE; });
        }, this);
        this._row.connectObject('notify::hover', () => this._armClose(), this);
        this._button.connectObject('notify::hover', () => this._armClose(), this);
        this._settings.connectObject('changed::pinned', () => this._sync(), this);

        this._sync();
    }

    disable() {
        if (this._closeId) GLib.source_remove(this._closeId);
        this._closeId = 0;
        this._row?.disconnectObject(this);
        this._rightBox?.disconnectObject(this);
        this._settings?.disconnectObject(this);
        this._button?.menu.disconnectObject(this);
        for (const container of [...this._moved.keys()])
            this._restore(container);
        for (const [c, id] of this._destroyIds) c.disconnect(id);
        this._destroyIds.clear();
        this._button?.disconnectObject(this);
        this._button?.destroy();
        this._button = null;
        this._row?.destroy();
        this._row = null;
        this._pinMenu = null;
        this._settings = null;
        this._rightBox = null;
    }

    // fecha a gaveta 3 s depois que o mouse sai, se nenhum menu dela estiver aberto
    _armClose() {
        if (this._closeId) GLib.source_remove(this._closeId);
        this._closeId = 0;
        if (!this._row?.visible) return;
        this._closeId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            this._closeId = 0;
            const active = Main.panel.menuManager.activeMenu;
            const fromDrawer = !!active?.sourceActor && this._row.contains(active.sourceActor);
            if (this._row.hover || this._button.hover || fromDrawer) {
                this._armClose();
            } else {
                this._row.visible = false;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _indicators() {
        const out = [];
        for (const [key, ind] of Object.entries(Main.panel.statusArea)) {
            if (!key.startsWith(PREFIX) || !ind?.container) continue;
            const raw = ind._indicator;
            const id = raw?.id || key;
            const name = raw?.title || raw?.id || key.slice(PREFIX.length);
            out.push({key, id, name, container: ind.container});
        }
        return out;
    }

    _sync() {
        if (!this._button) return;
        for (const ind of this._indicators()) {
            const isMoved = this._moved.has(ind.container);
            const pin = this._isPinned(ind.id);
            if (pin && isMoved) this._restore(ind.container);
            else if (!pin && !isMoved) this._hide(ind.container);
        }
        this._placeButton();
    }

    // "⋯" logo à direita do último ícone de systray que ficou na barra
    _placeButton() {
        const btn = this._button.container;
        const kids = this._rightBox.get_children().filter(c => c !== btn && c !== this._row);
        const trays = new Set(this._indicators().map(i => i.container));
        let idx = -1;
        kids.forEach((c, i) => { if (trays.has(c)) idx = i; });
        const target = idx + 1;
        const cur = this._rightBox.get_children();
        if (cur.indexOf(this._row) === target && cur.indexOf(btn) === target + 1) return;
        this._busy = true;
        this._rightBox.set_child_at_index(this._row, target);
        this._rightBox.set_child_at_index(btn, target + 1);
        this._busy = false;
    }

    // entrada terminada em '*' casa por prefixo (ex.: claude-usage-*)
    _isPinned(id) {
        return this._settings.get_strv('pinned').some(p =>
            p.endsWith('*') ? id.startsWith(p.slice(0, -1)) : p === id);
    }

    _hide(container) {
        const parent = container.get_parent();
        if (parent !== this._rightBox) return;
        const index = this._rightBox.get_children().indexOf(container);
        this._busy = true;
        this._rightBox.remove_child(container);
        this._row.add_child(container);
        this._busy = false;
        this._moved.set(container, {index});
        if (!this._destroyIds.has(container)) {
            this._destroyIds.set(container, container.connect('destroy', () => {
                this._moved.delete(container);
                this._destroyIds.delete(container);
            }));
        }
    }

    _restore(container) {
        const info = this._moved.get(container);
        this._moved.delete(container);
        if (!info || container.get_parent() !== this._row) return;
        this._busy = true;
        this._row.remove_child(container);
        const n = this._rightBox.get_n_children();
        this._rightBox.insert_child_at_index(container, Math.min(info.index, n));
        this._busy = false;
    }

    _rebuildPinMenu() {
        this._pinMenu.menu.removeAll();
        const inds = this._indicators().sort((a, b) => a.name.localeCompare(b.name));
        if (!inds.length) {
            this._pinMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem('(nenhum ícone)', {reactive: false}));
            return;
        }
        for (const ind of inds) {
            const sw = new PopupMenu.PopupSwitchMenuItem(ind.name, this._isPinned(ind.id));
            sw.connect('toggled', (_i, state) => {
                const cur = new Set(this._settings.get_strv('pinned'));
                if (state) {
                    cur.add(ind.id);
                } else {
                    cur.delete(ind.id);
                    for (const p of [...cur])
                        if (p.endsWith('*') && ind.id.startsWith(p.slice(0, -1))) cur.delete(p);
                }
                this._settings.set_strv('pinned', [...cur]);
            });
            this._pinMenu.menu.addMenuItem(sw);
        }
    }
}
