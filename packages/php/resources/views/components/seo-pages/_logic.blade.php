{{-- Internal: the issue catalogue and the score maths of x-nq::seo-pages, ported from seo-issue-catalog.ts and seo-pages-math.ts. Included with
     @include('nasaq::components.seo-pages._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_seo_catalog')) {
        /** The common on-page issues in English and Arabic: [code => [severity, en => [title, why, fix], ar => […]]]. */
        function nq_seo_catalog(): array
        {
            return [
            'title-missing' => ['severity' => 'error',
                'en' => ['title' => 'Missing title', 'why' => 'Without a title tag search engines invent one from the page.', 'fix' => 'Add a unique <title> of 30 to 60 characters that names the topic and the brand.'],
                'ar' => ['title' => 'العنوان مفقود', 'why' => 'دون وسم عنوان ستخترع محركات البحث عنوانًا من الصفحة.', 'fix' => 'أضف <title> فريدًا من 30 إلى 60 حرفًا يذكر الموضوع والعلامة.']],
            'title-long' => ['severity' => 'warning',
                'en' => ['title' => 'Title too long', 'why' => 'Titles over about 60 characters are cut off in results.', 'fix' => 'Shorten the title and move the brand name to the end.'],
                'ar' => ['title' => 'العنوان طويل جدًا', 'why' => 'العناوين التي تزيد عن 60 حرفًا تقريبًا تُقصّ في النتائج.', 'fix' => 'اختصر العنوان وانقل اسم العلامة إلى آخره.']],
            'title-duplicate' => ['severity' => 'warning',
                'en' => ['title' => 'Duplicate title', 'why' => 'Several pages share this title, so they compete for the same result.', 'fix' => 'Give every page a title that describes only that page.'],
                'ar' => ['title' => 'عنوان مكرر', 'why' => 'صفحات عدة تشترك في هذا العنوان فتتنافس على النتيجة نفسها.', 'fix' => 'امنح كل صفحة عنوانًا يصفها وحدها.']],
            'description-missing' => ['severity' => 'warning',
                'en' => ['title' => 'Missing meta description', 'why' => 'Search engines will pick a random snippet, which lowers the click rate.', 'fix' => 'Write a 70 to 160 character description that says what the visitor gets.'],
                'ar' => ['title' => 'الوصف التعريفي مفقود', 'why' => 'ستختار محركات البحث مقتطفًا عشوائيًا مما يخفض نسبة النقر.', 'fix' => 'اكتب وصفًا من 70 إلى 160 حرفًا يذكر ما سيحصل عليه الزائر.']],
            'description-short' => ['severity' => 'info',
                'en' => ['title' => 'Meta description too short', 'why' => 'A short description wastes the space you get in results.', 'fix' => 'Extend it to at least 70 characters with the main benefit and a call to action.'],
                'ar' => ['title' => 'الوصف التعريفي قصير', 'why' => 'الوصف القصير يهدر المساحة المتاحة في النتائج.', 'fix' => 'مدّده إلى 70 حرفًا على الأقل مع الفائدة الرئيسية ودعوة للإجراء.']],
            'h1-missing' => ['severity' => 'error',
                'en' => ['title' => 'No H1 heading', 'why' => 'The H1 tells readers and crawlers what the page is about.', 'fix' => 'Add one H1 that matches the main topic of the page.'],
                'ar' => ['title' => 'لا عنوان H1', 'why' => 'يخبر H1 القرّاء والزواحف بموضوع الصفحة.', 'fix' => 'أضف عنوان H1 واحدًا يطابق موضوع الصفحة الرئيسي.']],
            'alt-missing' => ['severity' => 'warning',
                'en' => ['title' => 'Images without alt text', 'why' => 'Alt text is how screen readers and image search understand a picture.', 'fix' => 'Describe each meaningful image in its alt attribute and leave decorative ones empty.'],
                'ar' => ['title' => 'صور بلا نص بديل', 'why' => 'النص البديل هو ما تفهم به قارئات الشاشة وبحث الصور الصورة.', 'fix' => 'صف كل صورة مهمة في سمة alt واترك الزخرفية فارغة.']],
            'canonical-missing' => ['severity' => 'warning',
                'en' => ['title' => 'No canonical link', 'why' => 'Without a canonical URL, duplicates of this page can split its ranking.', 'fix' => 'Add <link rel="canonical"> pointing at the preferred URL of the page.'],
                'ar' => ['title' => 'لا رابط أساسي', 'why' => 'دون رابط أساسي قد تقسّم نسخ الصفحة المكررة ترتيبها.', 'fix' => 'أضف <link rel="canonical"> يشير إلى الرابط المفضّل للصفحة.']],
            'noindex' => ['severity' => 'error',
                'en' => ['title' => 'Blocked from the index', 'why' => 'A noindex tag or robots rule keeps this page out of search results.', 'fix' => 'Remove the noindex directive if the page should rank, then request indexing.'],
                'ar' => ['title' => 'الصفحة محجوبة عن الفهرس', 'why' => 'وسم noindex أو قاعدة robots تُبقي الصفحة خارج نتائج البحث.', 'fix' => 'أزل توجيه noindex إن كان يجب أن تظهر الصفحة ثم اطلب الفهرسة.']],
            'broken-links' => ['severity' => 'error',
                'en' => ['title' => 'Broken links', 'why' => 'Links that return 404 waste crawl budget and frustrate readers.', 'fix' => 'Update or remove each broken link, or redirect the old address.'],
                'ar' => ['title' => 'روابط معطلة', 'why' => 'الروابط التي تعيد 404 تهدر ميزانية الزحف وتزعج القرّاء.', 'fix' => 'حدّث كل رابط معطل أو احذفه أو أعد توجيه العنوان القديم.']],
            'slow-lcp' => ['severity' => 'warning',
                'en' => ['title' => 'Slow largest paint', 'why' => 'A largest contentful paint over 2.5 s counts against page experience.', 'fix' => 'Compress the hero image, preload it, and cut render-blocking scripts.'],
                'ar' => ['title' => 'أكبر عنصر يُرسم ببطء', 'why' => 'زمن أكبر رسم للمحتوى فوق 2.5 ثانية يؤثر في تجربة الصفحة.', 'fix' => 'اضغط صورة الواجهة وحمّلها مسبقًا وقلّل السكربتات المعطلة للعرض.']],
            'og-image-missing' => ['severity' => 'info',
                'en' => ['title' => 'No share image', 'why' => 'Links to this page show no picture on social networks and chats.', 'fix' => 'Add an og:image of 1200 by 630 pixels.'],
                'ar' => ['title' => 'لا صورة للمشاركة', 'why' => 'روابط هذه الصفحة تظهر بلا صورة في الشبكات الاجتماعية والمحادثات.', 'fix' => 'أضف og:image بأبعاد 1200 × 630 بكسل.']],
            'viewport-missing' => ['severity' => 'error',
                'en' => ['title' => 'No mobile viewport', 'why' => 'Without a viewport tag the page is not mobile friendly.', 'fix' => 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.'],
                'ar' => ['title' => 'لا إطار عرض للجوال', 'why' => 'دون وسم viewport لا تكون الصفحة ملائمة للجوال.', 'fix' => 'أضف <meta name="viewport" content="width=device-width, initial-scale=1">.']],
            'schema-missing' => ['severity' => 'info',
                'en' => ['title' => 'No structured data', 'why' => 'Structured data makes the page eligible for rich results.', 'fix' => 'Add JSON-LD for the page type, such as Article, Product or FAQ.'],
                'ar' => ['title' => 'لا بيانات منظمة', 'why' => 'البيانات المنظمة تؤهل الصفحة للنتائج المعززة.', 'fix' => 'أضف JSON-LD لنوع الصفحة مثل Article أو Product أو FAQ.']],
            ];
        }
    }
@endphp
