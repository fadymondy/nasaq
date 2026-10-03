<?php

namespace Nasaq;

/**
 * The system menu a desktop puts at its leading corner: About, Settings, then Sleep, Restart, Shut Down and Log out.
 * Port of desktopPowerMenu() in the React desktop-os-shell. Pass the result in the menus of <x-nq::desktop-os-shell>;
 * choosing an item fires "nq-desktop-menu" { id: "system.restart" } on the shell.
 *
 *   <x-nq::desktop-os-shell :menus="[\Nasaq\DesktopPowerMenu::make(['actions' => ['about', 'settings', 'sleep', 'restart', 'shutDown', 'logOut'], 'appName' => 'ToGO', 'confirm' => true])]" />
 *
 * Options: actions (the ids to show, in the fixed order; default all), appName ("About ToGO"), confirm (true asks first before restart,
 * shut down and log out through <x-nq::confirm-provider>; sleep never asks), locale, id (default "system"), label, labels (overrides by key).
 */
class DesktopPowerMenu
{
    /** The order the actions appear in. */
    public const ACTIONS = ['about', 'settings', 'sleep', 'restart', 'shutDown', 'logOut'];

    /** Actions that ask first when confirm is on. */
    public const CONFIRMED = ['restart', 'shutDown', 'logOut'];

    private const STRINGS = [
        'en' => [
            'menu' => 'System',
            'about' => 'About',
            'aboutApp' => 'About {app}',
            'settings' => 'System Settings…',
            'sleep' => 'Sleep',
            'restart' => 'Restart…',
            'shutDown' => 'Shut Down…',
            'logOut' => 'Log Out',
            'restartTitle' => 'Restart now?',
            'restartDescription' => 'Open apps close. Unsaved work may be lost.',
            'restartConfirm' => 'Restart',
            'shutDownTitle' => 'Shut down now?',
            'shutDownDescription' => 'Open apps close. Unsaved work may be lost.',
            'shutDownConfirm' => 'Shut Down',
            'logOutTitle' => 'Log out now?',
            'logOutDescription' => 'You will need to sign in again.',
            'logOutConfirm' => 'Log Out',
        ],
        'ar' => [
            'menu' => 'النظام',
            'about' => 'حول',
            'aboutApp' => 'حول {app}',
            'settings' => 'إعدادات النظام…',
            'sleep' => 'سكون',
            'restart' => 'إعادة التشغيل…',
            'shutDown' => 'إيقاف التشغيل…',
            'logOut' => 'تسجيل الخروج',
            'restartTitle' => 'إعادة التشغيل الآن؟',
            'restartDescription' => 'ستُغلق التطبيقات المفتوحة وقد يضيع العمل غير المحفوظ.',
            'restartConfirm' => 'إعادة التشغيل',
            'shutDownTitle' => 'إيقاف التشغيل الآن؟',
            'shutDownDescription' => 'ستُغلق التطبيقات المفتوحة وقد يضيع العمل غير المحفوظ.',
            'shutDownConfirm' => 'إيقاف التشغيل',
            'logOutTitle' => 'تسجيل الخروج الآن؟',
            'logOutDescription' => 'ستحتاج إلى تسجيل الدخول مرة أخرى.',
            'logOutConfirm' => 'تسجيل الخروج',
        ],
    ];

    /** The built-in strings for a locale (default: the app locale) with any overrides on top. */
    public static function labels(?string $locale = null, array $labels = []): array
    {
        return array_merge(self::STRINGS[Nasaq::rtl($locale) ? 'ar' : 'en'], $labels);
    }

    /** The confirmation for an action, or null for one that never asks. */
    public static function confirmation(string $action, array $t): ?array
    {
        return match ($action) {
            'restart' => ['action' => $action, 'title' => $t['restartTitle'], 'description' => $t['restartDescription'], 'confirmLabel' => $t['restartConfirm'], 'danger' => false],
            'shutDown' => ['action' => $action, 'title' => $t['shutDownTitle'], 'description' => $t['shutDownDescription'], 'confirmLabel' => $t['shutDownConfirm'], 'danger' => true],
            'logOut' => ['action' => $action, 'title' => $t['logOutTitle'], 'description' => $t['logOutDescription'], 'confirmLabel' => $t['logOutConfirm'], 'danger' => true],
            default => null,
        };
    }

    /**
     * The menu array for the shell's `menus`. The power group (Sleep, Restart, Shut Down) and Log out each start after a
     * separator; Log out is marked danger.
     *
     * @return array{id: string, label: string, items: list<array<string, mixed>>}
     */
    public static function make(array $options = []): array
    {
        $t = self::labels($options['locale'] ?? null, $options['labels'] ?? []);
        $actions = $options['actions'] ?? self::ACTIONS;
        $items = [];
        $group = '';
        foreach (self::ACTIONS as $action) {
            if (! in_array($action, $actions, true)) {
                continue;
            }
            $itemGroup = in_array($action, ['about', 'settings'], true) ? 'info' : ($action === 'logOut' ? 'session' : 'power');
            $label = $action === 'about' && ! empty($options['appName']) ? str_replace('{app}', $options['appName'], $t['aboutApp']) : $t[$action];
            $prompt = ! empty($options['confirm']) ? self::confirmation($action, $t) : null;
            $items[] = array_filter([
                'id' => $action,
                'label' => $label,
                'danger' => $action === 'logOut' ? true : null,
                'separated' => $group !== '' && $group !== $itemGroup ? true : null,
                'confirm' => $prompt,
            ], fn ($v) => $v !== null);
            $group = $itemGroup;
        }

        return ['id' => $options['id'] ?? 'system', 'label' => $options['label'] ?? $t['menu'], 'items' => $items];
    }
}
