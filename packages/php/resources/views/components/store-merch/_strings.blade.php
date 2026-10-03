{{-- Internal: the en/ar strings of the storefront merchandising blocks (same keys as the React kit) and the countdown helpers.
     nq_merch_t('shopNow'), nq_merch_t('claimed', ['percent' => 40]). Pass `labels` (an array of overrides) as the third argument. --}}
@php
    if (! function_exists('nq_merch_t')) {
        function nq_merch_t(string $key, array $vars = [], ?array $labels = null): string
        {
            static $all = null;
            $all ??= json_decode(<<<'JSON'
{"en":{"shopNow":"Shop now","shopCategory":"Shop {name}","itemsCount":"Items: {n}","categories":"Shop by category","promotions":"Promotions","flashDeals":"Flash deals","endsIn":"Ends in","days":"days","hours":"hours","minutes":"minutes","seconds":"seconds","dayShort":"d","hourShort":"h","minuteShort":"m","secondShort":"s","dealEnded":"This deal has ended","timeLeft":"Time left: {time}","claimed":"{percent}% claimed","almostGone":"Almost gone","viewAllDeals":"View all deals","relatedProducts":"You may also like","recentlyViewed":"Recently viewed","carouselOf":"{title} carousel","viewAll":"View all","brands":"Our brands","brandLink":"Shop {name}"},"ar":{"shopNow":"تسوّق الآن","shopCategory":"تسوّق {name}","itemsCount":"{n} منتجات","categories":"تسوّق حسب القسم","promotions":"العروض","flashDeals":"عروض سريعة","endsIn":"ينتهي خلال","days":"أيام","hours":"ساعات","minutes":"دقائق","seconds":"ثوانٍ","dayShort":"ي","hourShort":"س","minuteShort":"د","secondShort":"ث","dealEnded":"انتهى هذا العرض","timeLeft":"الوقت المتبقي: {time}","claimed":"تم استهلاك {percent}%","almostGone":"أوشك على النفاد","viewAllDeals":"عرض كل العروض","relatedProducts":"قد يعجبك أيضًا","recentlyViewed":"شاهدتها مؤخرًا","carouselOf":"شريط {title}","viewAll":"عرض الكل","brands":"علاماتنا التجارية","brandLink":"تسوّق {name}"}}
JSON, true);
            $set = $all[\Nasaq\Nasaq::rtl() ? 'ar' : 'en'];
            $text = $labels[$key] ?? $set[$key] ?? $key;

            return preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($vars[$m[1]] ?? ''), $text);
        }

        /** Current time in epoch milliseconds (follows a frozen test clock). */
        function nq_merch_now(): int
        {
            return now()->getTimestamp() * 1000 + (int) now()->format('v');
        }

        /** Days, hours, minutes, seconds left until $endsAt (epoch ms). */
        function nq_merch_parts(int|float $endsAt, int|float $now): array
        {
            $remaining = max(0, (int) floor($endsAt - $now));
            $total = (int) ceil($remaining / 1000);

            return ['d' => intdiv($total, 86400), 'h' => intdiv($total % 86400, 3600), 'm' => intdiv($total % 3600, 60), 's' => $total % 60, 'done' => $remaining <= 0];
        }

        /** Whole-percent share claimed, clamped to 0..100. */
        function nq_merch_progress(int|float|null $sold, int|float|null $total): int
        {
            if (! $total || $total <= 0 || ! $sold || $sold <= 0) { return 0; }

            return (int) min(100, floor(($sold * 100) / $total));
        }

        /** Deals that have started and not ended, soonest ending first. */
        function nq_merch_active(array $deals, int|float $now): array
        {
            $live = array_values(array_filter($deals, fn ($d) => (! isset($d['startsAt']) || $now >= $d['startsAt']) && $now < $d['endsAt']));
            usort($live, fn ($a, $b) => $a['endsAt'] <=> $b['endsAt']);

            return $live;
        }
    }
@endphp
