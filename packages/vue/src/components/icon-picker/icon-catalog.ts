import {
  Activity, AlarmClock, Anchor, Apple, Archive, Atom, AtSign, Award, Baby, Banknote, Barcode, Battery, Beer, Bell, Bike, Bird, Blocks, Book, BookOpen, Bookmark, Bot, Box, Boxes,
  Brain, Braces, Briefcase, Brush, Bug, Building2, Bus, Cake, Calendar, CalendarDays, Camera, Car, ChartBar, ChartLine, ChartPie, Check, CircleCheck, CircleQuestionMark, CircleX,
  ClipboardCheck, ClipboardList, Clock, Cloud, CloudRain, Code, Coffee, Coins, Compass, Copy, Cpu, CreditCard, Crown, Database, Diamond, DollarSign, Download, Droplet, Dumbbell,
  Ellipsis, Eye, EyeOff, Factory, File, FileArchive, FileCode, FileImage, FileJson, FileSpreadsheet, FileText, Files, Film, Filter, Fingerprint, Fish, Flag, Flame, FlaskConical,
  Flower2, Folder, FolderKanban, FolderOpen, Fuel, Gamepad2, GitBranch, GitPullRequest, Gift, Globe, GraduationCap, Hammer, Hand, Handshake, HardDrive, Headphones, Heart,
  HeartPulse, Hexagon, Hourglass, House, Image, Inbox, Info, Key, Keyboard, Landmark, Languages, Laptop, Layers, LayoutDashboard, LayoutGrid, Leaf, Library, LifeBuoy, Lightbulb,
  Link, List, ListChecks, ListTodo, Lock, LockOpen, Mail, MailOpen, Map, MapPin, Medal, Megaphone, Menu, MessageCircle, MessageSquare, Mic, Minus, Monitor, Moon, Mountain, Mouse,
  Music, Navigation, Newspaper, Notebook, Package, Palette, Paperclip, Pause, Pencil, PenTool, Percent, Phone, Pill, Pin, Pizza, Plane, Play, Plug, Plus, Power, Printer, Puzzle,
  QrCode, Receipt, Recycle, Rocket, Ruler, School, Scissors, Search, Send, Server, Settings, Shapes, Share2, Shield, ShieldCheck, Ship, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Smartphone, Smile, Snowflake, Sparkles, Star, StickyNote, Stethoscope, Store, Sun, Table, Tag, Tags, Target, Telescope, Tent, Terminal, ThumbsUp, Timer, Trash2, TreePine,
  TrendingDown, TrendingUp, Trophy, Truck, Tv, Umbrella, Upload, User, UserRound, Users, Utensils, Video, Wallet, Warehouse, Waves, Wifi, Wind, Wine, Wrench, X, Zap,
  type LucideIcon,
} from "lucide-vue-next";

/**
 * The curated icon set: about 220 lucide icons chosen for product UI (workspaces, projects, CRM, billing, files,
 * devices), in categories, each with English and Arabic search keywords. Not all 1,900+ lucide icons: importing
 * them all would put every icon in the bundle. Pass `icons` to `IconPicker` to use your own list.
 */
export type IconCategory = "general" | "files" | "communication" | "business" | "commerce" | "data" | "people" | "dev" | "media" | "design" | "nature" | "travel" | "health";

export const ICON_CATEGORIES: readonly IconCategory[] = ["general", "files", "communication", "business", "commerce", "data", "people", "dev", "media", "design", "nature", "travel", "health"];

export interface IconEntry {
  /** kebab-case lucide name, the value the picker returns. */
  name: string;
  icon: LucideIcon;
  category: IconCategory | (string & {});
  /** English search words. */
  keywords: string;
  /** Arabic search words. */
  keywordsAr?: string;
}

/** `ArrowDown` to `arrow-down`, `Building2` to `building-2`. */
export function toKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z0-9])/g, "$1-$2")
    .replace(/([0-9])([A-Za-z])/g, "$1-$2")
    .toLowerCase();
}

type Row = [string, LucideIcon, string, string?];
const group = (category: IconCategory, rows: Row[]): IconEntry[] =>
  rows.map(([id, icon, keywords, keywordsAr]) => ({ name: toKebab(id), icon, category, keywords, keywordsAr }));

export const ICON_CATALOG: readonly IconEntry[] = [
  ...group("general", [
    ["House", House, "home house start", "رئيسية بيت منزل"], ["Star", Star, "favorite rating", "نجمة مفضلة تقييم"], ["Heart", Heart, "like love favorite", "قلب اعجاب حب"], ["Bookmark", Bookmark, "save saved", "حفظ علامة"],
    ["Flag", Flag, "report milestone", "علم راية"], ["Tag", Tag, "label price", "وسم بطاقة"], ["Tags", Tags, "labels", "وسوم"], ["Pin", Pin, "pinned", "تثبيت دبوس"], ["MapPin", MapPin, "location place", "موقع مكان"],
    ["Calendar", Calendar, "date schedule", "تقويم تاريخ"], ["CalendarDays", CalendarDays, "days month", "ايام شهر"], ["Clock", Clock, "time hour", "ساعة وقت"], ["AlarmClock", AlarmClock, "alarm reminder", "منبه تذكير"], ["Timer", Timer, "stopwatch", "مؤقت"],
    ["Hourglass", Hourglass, "wait pending", "انتظار"], ["Bell", Bell, "notification alert", "اشعار تنبيه"], ["Search", Search, "find magnifier", "بحث"], ["Settings", Settings, "gear preferences", "اعدادات"], ["SlidersHorizontal", SlidersHorizontal, "controls filter", "تحكم"],
    ["Filter", Filter, "funnel", "تصفية"], ["Menu", Menu, "hamburger navigation", "قائمة"], ["Ellipsis", Ellipsis, "more dots", "المزيد"], ["Plus", Plus, "add new", "اضافة جديد"], ["Minus", Minus, "remove less", "ناقص"],
    ["Check", Check, "done tick", "تم صح"], ["CircleCheck", CircleCheck, "success complete", "نجاح اكتمال"], ["CircleX", CircleX, "error cancel", "خطأ الغاء"], ["X", X, "close", "اغلاق"], ["Info", Info, "information", "معلومات"],
    ["CircleQuestionMark", CircleQuestionMark, "help question", "مساعدة سؤال"], ["Eye", Eye, "view visible", "عرض اظهار"], ["EyeOff", EyeOff, "hidden hide", "اخفاء"], ["Copy", Copy, "duplicate", "نسخ"], ["Trash2", Trash2, "delete bin", "حذف سلة"],
    ["Pencil", Pencil, "edit write", "تعديل قلم"], ["Download", Download, "save", "تنزيل"], ["Upload", Upload, "send file", "رفع"], ["Share2", Share2, "share", "مشاركة"], ["Link", Link, "url chain", "رابط"], ["Paperclip", Paperclip, "attachment", "مرفق"],
    ["Lock", Lock, "secure private", "قفل خاص"], ["LockOpen", LockOpen, "unlock", "فتح"], ["Key", Key, "password access", "مفتاح كلمة مرور"], ["Shield", Shield, "protection", "درع حماية"], ["ShieldCheck", ShieldCheck, "verified secure", "حماية موثقة"],
    ["Power", Power, "on off", "تشغيل"], ["Zap", Zap, "lightning fast energy", "برق سريع طاقة"], ["Sparkles", Sparkles, "magic ai new", "لمعان سحر ذكاء"], ["Lightbulb", Lightbulb, "idea tip", "فكرة"], ["Target", Target, "goal aim", "هدف"],
    ["Puzzle", Puzzle, "plugin extension", "اضافة"], ["LayoutGrid", LayoutGrid, "grid apps", "شبكة تطبيقات"], ["LayoutDashboard", LayoutDashboard, "dashboard overview", "لوحة"], ["List", List, "items rows", "قائمة"], ["ListTodo", ListTodo, "tasks todo", "مهام"],
    ["ListChecks", ListChecks, "checklist", "قائمة تحقق"], ["Layers", Layers, "stack levels", "طبقات"], ["Fingerprint", Fingerprint, "identity biometric", "بصمة"], ["QrCode", QrCode, "scan code", "رمز"], ["Barcode", Barcode, "scan product", "باركود"],
  ]),
  ...group("files", [
    ["File", File, "document", "ملف"], ["FileText", FileText, "document text", "مستند نص"], ["Files", Files, "documents copies", "ملفات"], ["FileSpreadsheet", FileSpreadsheet, "excel csv table", "جدول بيانات"], ["FileImage", FileImage, "picture", "ملف صورة"],
    ["FileCode", FileCode, "source code", "ملف برمجي"], ["FileJson", FileJson, "json data", "ملف جيسون"], ["FileArchive", FileArchive, "zip compressed", "ملف مضغوط"], ["Folder", Folder, "directory", "مجلد"], ["FolderOpen", FolderOpen, "directory open", "مجلد مفتوح"],
    ["FolderKanban", FolderKanban, "project board", "مشروع لوحة"], ["Archive", Archive, "archived box storage", "ارشيف"], ["Inbox", Inbox, "incoming", "وارد"], ["Newspaper", Newspaper, "news article", "اخبار مقال"], ["Notebook", Notebook, "notes journal", "دفتر ملاحظات"],
    ["StickyNote", StickyNote, "note memo", "ملاحظة"], ["ClipboardList", ClipboardList, "list form", "حافظة قائمة"], ["ClipboardCheck", ClipboardCheck, "approved checklist", "حافظة موافقة"], ["Book", Book, "manual", "كتاب"], ["BookOpen", BookOpen, "reading docs", "كتاب مفتوح"],
    ["Library", Library, "collection", "مكتبة"], ["Printer", Printer, "print", "طابعة"], ["Table", Table, "grid rows", "جدول"],
  ]),
  ...group("communication", [
    ["Mail", Mail, "email message", "بريد رسالة"], ["MailOpen", MailOpen, "read email", "بريد مفتوح"], ["Send", Send, "submit paper plane", "ارسال"], ["MessageSquare", MessageSquare, "chat comment", "محادثة تعليق"], ["MessageCircle", MessageCircle, "chat bubble", "رسالة"],
    ["Phone", Phone, "call", "هاتف اتصال"], ["Video", Video, "meeting camera film clip", "فيديو اجتماع"], ["Mic", Mic, "microphone voice", "ميكروفون صوت"], ["Megaphone", Megaphone, "announce campaign", "اعلان حملة"], ["AtSign", AtSign, "mention email", "اشارة"],
    ["Globe", Globe, "web world internet", "عالم انترنت"], ["Languages", Languages, "translate language", "لغات ترجمة"], ["Bot", Bot, "assistant robot ai", "روبوت مساعد"], ["Handshake", Handshake, "deal partner", "اتفاق شراكة"],
  ]),
  ...group("business", [
    ["Building2", Building2, "company office organization", "شركة مكتب مؤسسة"], ["Briefcase", Briefcase, "work job", "حقيبة عمل"], ["Landmark", Landmark, "bank government", "بنك حكومة"], ["Factory", Factory, "industry manufacturing", "مصنع صناعة"],
    ["Warehouse", Warehouse, "storage inventory", "مستودع مخزن"], ["Store", Store, "shop retail", "متجر"], ["School", School, "education", "مدرسة"], ["GraduationCap", GraduationCap, "student academy", "تخرج اكاديمية"], ["Award", Award, "prize badge", "جائزة"],
    ["Medal", Medal, "rank", "ميدالية"], ["Trophy", Trophy, "winner", "كأس فوز"], ["Crown", Crown, "premium king", "تاج مميز"], ["Rocket", Rocket, "launch startup", "صاروخ اطلاق"], ["Flame", Flame, "hot trending", "لهب شائع"],
    ["Diamond", Diamond, "gem value", "الماس"], ["Anchor", Anchor, "harbor stable", "مرساة"], ["LifeBuoy", LifeBuoy, "support help", "دعم"],
  ]),
  ...group("commerce", [
    ["Wallet", Wallet, "money", "محفظة"], ["CreditCard", CreditCard, "payment card", "بطاقة دفع"], ["Banknote", Banknote, "cash money", "نقد"], ["Coins", Coins, "money change", "عملات"], ["Receipt", Receipt, "invoice bill", "ايصال فاتورة"],
    ["ShoppingCart", ShoppingCart, "basket buy", "سلة تسوق"], ["ShoppingBag", ShoppingBag, "purchase", "حقيبة تسوق"], ["Package", Package, "parcel product", "طرد منتج"], ["Boxes", Boxes, "inventory", "صناديق"], ["Box", Box, "container", "صندوق"],
    ["Truck", Truck, "delivery shipping", "توصيل شحن"], ["Gift", Gift, "present reward", "هدية"], ["Percent", Percent, "discount", "خصم"], ["DollarSign", DollarSign, "currency price", "دولار سعر"],
  ]),
  ...group("data", [
    ["ChartBar", ChartBar, "bar graph analytics", "مخطط اعمدة تحليلات"], ["ChartLine", ChartLine, "line graph trend", "مخطط خطي"], ["ChartPie", ChartPie, "pie share", "مخطط دائري"], ["TrendingUp", TrendingUp, "growth increase", "نمو ارتفاع"],
    ["TrendingDown", TrendingDown, "decline decrease", "انخفاض"], ["Activity", Activity, "pulse heartbeat", "نشاط"], ["Database", Database, "storage sql", "قاعدة بيانات"], ["Server", Server, "hosting", "خادم"], ["HardDrive", HardDrive, "disk storage", "قرص"],
    ["Cpu", Cpu, "processor chip", "معالج"], ["Wifi", Wifi, "network wireless", "شبكة"], ["Blocks", Blocks, "modules building", "وحدات"], ["Shapes", Shapes, "objects", "اشكال"],
  ]),
  ...group("people", [
    ["User", User, "person profile account", "مستخدم شخص حساب"], ["UserRound", UserRound, "person avatar", "شخص"], ["Users", Users, "team group people", "فريق مجموعة"], ["Smile", Smile, "happy face", "ابتسامة سعيد"], ["ThumbsUp", ThumbsUp, "approve like", "موافقة اعجاب"],
    ["Hand", Hand, "stop wave", "يد"], ["Baby", Baby, "child", "طفل"],
  ]),
  ...group("dev", [
    ["Code", Code, "programming brackets", "برمجة كود"], ["Terminal", Terminal, "console shell cli", "طرفية"], ["Braces", Braces, "json object", "اقواس"], ["GitBranch", GitBranch, "version control", "فرع"], ["GitPullRequest", GitPullRequest, "merge review", "طلب دمج"],
    ["Bug", Bug, "issue defect", "خلل خطأ برمجي"], ["Plug", Plug, "integration connect api", "توصيل تكامل"], ["Laptop", Laptop, "computer", "حاسوب محمول"], ["Monitor", Monitor, "screen desktop", "شاشة"], ["Smartphone", Smartphone, "mobile phone", "جوال"],
    ["Keyboard", Keyboard, "typing", "لوحة مفاتيح"], ["Mouse", Mouse, "pointer", "فأرة"], ["Battery", Battery, "power charge", "بطارية"], ["Wrench", Wrench, "tool fix settings", "مفتاح صيانة"], ["Hammer", Hammer, "build tool", "مطرقة بناء"],
    ["Atom", Atom, "science react", "ذرة"], ["Brain", Brain, "intelligence ai", "دماغ ذكاء"],
  ]),
  ...group("media", [
    ["Image", Image, "picture photo", "صورة"], ["Camera", Camera, "photo", "كاميرا"], ["Film", Film, "movie cinema", "فيلم سينما"], ["Music", Music, "audio song", "موسيقى"], ["Headphones", Headphones, "listen audio", "سماعات"],
    ["Play", Play, "start media", "تشغيل"], ["Pause", Pause, "stop media", "ايقاف مؤقت"], ["Tv", Tv, "television screen", "تلفاز"], ["Gamepad2", Gamepad2, "games controller", "العاب"],
  ]),
  ...group("design", [
    ["Palette", Palette, "colors paint", "الوان"], ["Brush", Brush, "paint art", "فرشاة"], ["PenTool", PenTool, "vector draw", "قلم رسم"], ["Scissors", Scissors, "cut", "مقص"], ["Ruler", Ruler, "measure", "مسطرة"], ["Hexagon", Hexagon, "shape", "سداسي"],
  ]),
  ...group("nature", [
    ["Sun", Sun, "day light weather", "شمس طقس"], ["Moon", Moon, "night dark", "قمر ليل"], ["Cloud", Cloud, "weather storage", "سحابة"], ["CloudRain", CloudRain, "rain weather", "مطر"], ["Snowflake", Snowflake, "cold winter", "ثلج شتاء"],
    ["Umbrella", Umbrella, "rain cover", "مظلة"], ["Wind", Wind, "air breeze", "رياح"], ["Droplet", Droplet, "water liquid", "قطرة ماء"], ["Leaf", Leaf, "plant eco green", "ورقة نبات"], ["TreePine", TreePine, "forest tree", "شجرة"],
    ["Flower2", Flower2, "bloom garden", "زهرة"], ["Mountain", Mountain, "peak outdoor", "جبل"], ["Waves", Waves, "sea water", "امواج بحر"], ["Recycle", Recycle, "sustainable eco", "تدوير"], ["Bird", Bird, "animal", "طائر"], ["Fish", Fish, "animal sea", "سمكة"],
  ]),
  ...group("travel", [
    ["Car", Car, "vehicle drive", "سيارة"], ["Bus", Bus, "transport", "حافلة"], ["Bike", Bike, "cycle", "دراجة"], ["Plane", Plane, "flight airport", "طائرة سفر"], ["Ship", Ship, "boat cruise", "سفينة"], ["Fuel", Fuel, "gas station", "وقود"],
    ["Map", Map, "directions", "خريطة"], ["Compass", Compass, "direction explore", "بوصلة"], ["Navigation", Navigation, "gps route", "ملاحة"], ["Telescope", Telescope, "explore discover", "تلسكوب"], ["Tent", Tent, "camping", "خيمة"],
  ]),
  ...group("health", [
    ["HeartPulse", HeartPulse, "health heartbeat", "صحة نبض"], ["Stethoscope", Stethoscope, "doctor medical", "سماعة طبيب"], ["Pill", Pill, "medicine", "دواء"], ["FlaskConical", FlaskConical, "lab science chemistry", "مختبر كيمياء"], ["Dumbbell", Dumbbell, "fitness gym", "لياقة"],
    ["Coffee", Coffee, "drink cafe", "قهوة"], ["Utensils", Utensils, "food restaurant", "طعام مطعم"], ["Pizza", Pizza, "food", "بيتزا"], ["Apple", Apple, "fruit food", "تفاحة"], ["Beer", Beer, "drink", "مشروب"], ["Wine", Wine, "drink", "عصير"], ["Cake", Cake, "birthday party", "كعكة عيد ميلاد"],
  ]),
];
