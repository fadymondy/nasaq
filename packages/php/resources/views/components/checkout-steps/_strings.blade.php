{{-- Internal: the checkout-steps strings (port of STRINGS in web/src/components/checkout-steps/checkout-steps.tsx), defined once.
     @include('nasaq::components.checkout-steps._strings'), then nq_checkout_text('planTitle', $labels) or nq_checkout_text('pay', $labels, '$49.00').
     A string with arguments is a template: {0}, {1}. $labels overrides a key for every locale. --}}
@php
    if (! function_exists('nq_checkout_text')) {
        /** One checkout string for the current locale. */
        function nq_checkout_text(string $key, array $labels = [], string ...$args): string
        {
            static $table = [
            'steps' => ['Checkout steps', 'خطوات الدفع'],
            'plan' => ['Plan', 'الخطة'],
            'billing' => ['Billing details', 'بيانات الفوترة'],
            'payment' => ['Payment method', 'طريقة الدفع'],
            'review' => ['Review', 'المراجعة'],
            'success' => ['Done', 'تم'],
            'stepOf' => ['Step {0} of {1}', 'الخطوة {0} من {1}'],
            'planTitle' => ['Choose your plan', 'اختر خطتك'],
            'planDescription' => ['You can change or cancel it at any time.', 'يمكنك تغييرها أو إلغاؤها في أي وقت.'],
            'interval' => ['Billing period', 'فترة الفوترة'],
            'monthly' => ['Monthly', 'شهري'],
            'yearly' => ['Yearly', 'سنوي'],
            'save' => ['Save {0}', 'وفّر {0}'],
            'billedYearly' => ['Billed {0} yearly', 'تُحاسَب {0} سنويًا'],
            'billedMonthly' => ['Billed monthly', 'تُحاسَب شهريًا'],
            'choose' => ['Choose plan', 'اختر الخطة'],
            'selected' => ['Selected', 'الخطة المختارة'],
            'continue' => ['Continue', 'متابعة'],
            'back' => ['Back', 'رجوع'],
            'billingTitle' => ['Billing details', 'بيانات الفوترة'],
            'billingDescription' => ['Shown on your invoices.', 'تظهر في فواتيرك.'],
            'name' => ['Full name', 'الاسم الكامل'],
            'email' => ['Billing email', 'بريد الفوترة'],
            'company' => ['Company (optional)', 'الشركة (اختياري)'],
            'taxId' => ['Tax number (optional)', 'الرقم الضريبي (اختياري)'],
            'country' => ['Country', 'الدولة'],
            'address' => ['Street address', 'العنوان'],
            'city' => ['City', 'المدينة'],
            'postalCode' => ['Postal code', 'الرمز البريدي'],
            'required' => ['This field is required.', 'هذا الحقل مطلوب.'],
            'invalidEmail' => ['Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صحيحًا.'],
            'paymentTitle' => ['Payment method', 'طريقة الدفع'],
            'paymentDescription' => ['You are not charged until you confirm on the next step.', 'لن يُخصم منك شيء إلا بعد التأكيد في الخطوة التالية.'],
            'reviewTitle' => ['Review and confirm', 'راجع وأكّد'],
            'reviewDescription' => ['Check everything before you pay.', 'تأكد من كل شيء قبل الدفع.'],
            'edit' => ['Edit', 'تعديل'],
            'terms' => ['I agree to the terms of service and the billing policy.', 'أوافق على شروط الخدمة وسياسة الفوترة.'],
            'termsRequired' => ['Accept the terms to continue.', 'وافق على الشروط للمتابعة.'],
            'pay' => ['Pay {0}', 'ادفع {0}'],
            'paying' => ['Processing payment', 'جارٍ معالجة الدفع'],
            'failed' => ['The payment could not be completed. Check your details and try again.', 'تعذّر إتمام الدفع. تحقق من بياناتك وحاول مرة أخرى.'],
            'summary' => ['Order summary', 'ملخص الطلب'],
            'subtotal' => ['Subtotal', 'المجموع الفرعي'],
            'tax' => ['Tax', 'الضريبة'],
            'total' => ['Total due today', 'المستحق اليوم'],
            'perMonth' => ['per month', 'شهريًا'],
            'perYear' => ['per year', 'سنويًا'],
            'successTitle' => ['You are all set', 'تم تفعيل اشتراكك'],
            'successDescription' => ['Your {0} subscription is active. A receipt is on its way to your email.', 'اشتراكك في خطة {0} فعّال. أرسلنا الإيصال إلى بريدك.'],
            'reference' => ['Reference', 'المرجع'],
            'done' => ['Go to dashboard', 'الذهاب إلى لوحة التحكم'],
            'cardEnding' => ['{0} ending in {1}', '{0} تنتهي بـ {1}'],
            'bankTransfer' => ['Bank transfer', 'تحويل بنكي'],
            'card' => ['Credit or debit card', 'بطاقة ائتمان أو خصم'],
            'cardDescription' => ['Visa, Mastercard, American Express and mada.', 'فيزا وماستركارد وأمريكان إكسبرس ومدى.'],
            'bankDescription' => ['We email the bank details and activate the plan when the transfer lands.', 'نرسل بيانات الحساب البنكي ونفعّل الخطة عند وصول التحويل.'],
            'bankNote' => ['Your plan starts as soon as the transfer is received, usually within one working day.', 'تبدأ خطتك فور استلام التحويل، عادةً خلال يوم عمل واحد.'],
            'cardNumber' => ['Card number', 'رقم البطاقة'],
            'cardHolder' => ['Name on card', 'الاسم على البطاقة'],
            'expiry' => ['Expiry (MM/YY)', 'تاريخ الانتهاء (شهر/سنة)'],
            'cvc' => ['Security code', 'رمز الأمان'],
            'invalidCard' => ['Enter a valid card number.', 'أدخل رقم بطاقة صحيحًا.'],
            'invalidExpiry' => ['Enter a valid expiry date.', 'أدخل تاريخ انتهاء صحيحًا.'],
            'invalidCvc' => ['Enter the security code.', 'أدخل رمز الأمان.'],
            'secure' => ['Card details are entered here for display only. Nasaq never stores or sends them.', 'تُدخَل بيانات البطاقة هنا للعرض فقط. لا يخزّنها نسق ولا يرسلها.'],
            'unknownBrand' => ['Card', 'بطاقة'],
            'method' => ['Payment method', 'طريقة الدفع'],
            ];
            $text = $labels[$key] ?? \Nasaq\Nasaq::t(...($table[$key] ?? [$key, $key]));

            return str_replace(['{0}', '{1}'], [$args[0] ?? '', $args[1] ?? ''], $text);
        }
    }
@endphp
