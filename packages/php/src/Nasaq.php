<?php

namespace Nasaq;

/**
 * Asset tags and small helpers shared by the Blade components.
 */
class Nasaq
{
    /** The <link> for the precompiled stylesheet. Skip it when your own Tailwind build @source-s the components. */
    public static function styles(): string
    {
        return '<link rel="stylesheet" href="'.e(self::asset('nasaq.css')).'">';
    }

    /** Alpine's plugins plus the Nasaq behaviours. Load before Alpine starts (Livewire and Filament start it for you). */
    public static function scripts(): string
    {
        return '<script defer src="'.e(self::asset('nasaq-alpine.js')).'"></script>';
    }

    public static function asset(string $file): string
    {
        $cdn = config('nasaq.cdn');

        return $cdn ? rtrim($cdn, '/').'/'.$file : asset('vendor/nasaq/'.$file);
    }

    /** True when the current locale is Arabic (labels, currency). */
    public static function rtl(?string $locale = null): bool
    {
        return str_starts_with($locale ?? app()->getLocale(), 'ar');
    }

    /** The default currency: USD, or SAR in Arabic. */
    public static function currency(?string $locale = null): string
    {
        return config('nasaq.currency') ?? (self::rtl($locale) ? 'SAR' : 'USD');
    }

    /** A translated label: Nasaq::t('Close', 'إغلاق'). */
    public static function t(string $en, string $ar): string
    {
        return self::rtl() ? $ar : $en;
    }

    /** Formats an amount like formatMoney in the JS packages. */
    public static function money(float|int $amount, ?string $currency = null, ?string $locale = null): string
    {
        $locale ??= app()->getLocale();
        $currency ??= self::currency($locale);
        if (class_exists(\NumberFormatter::class)) {
            $f = new \NumberFormatter((self::rtl($locale) ? 'ar-SA' : str_replace('_', '-', $locale)).'@numbers=latn', \NumberFormatter::CURRENCY);

            return $f->formatCurrency($amount, $currency);
        }

        return $currency.' '.number_format($amount, 2);
    }
}
