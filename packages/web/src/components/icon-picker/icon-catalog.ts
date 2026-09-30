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
} from "lucide-react";

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

type Row = [LucideIcon, string, string?];
const group = (category: IconCategory, rows: Row[]): IconEntry[] =>
  rows.map(([icon, keywords, keywordsAr]) => ({ name: toKebab(icon.displayName ?? ""), icon, category, keywords, keywordsAr }));

export const ICON_CATALOG: readonly IconEntry[] = [
  ...group("general", [
    [House, "home house start", "رئيسية بيت منزل"], [Star, "favorite rating", "نجمة مفضلة تقييم"], [Heart, "like love favorite", "قلب اعجاب حب"], [Bookmark, "save saved", "حفظ علامة"],
    [Flag, "report milestone", "علم راية"], [Tag, "label price", "وسم بطاقة"], [Tags, "labels", "وسوم"], [Pin, "pinned", "تثبيت دبوس"], [MapPin, "location place", "موقع مكان"],
    [Calendar, "date schedule", "تقويم تاريخ"], [CalendarDays, "days month", "ايام شهر"], [Clock, "time hour", "ساعة وقت"], [AlarmClock, "alarm reminder", "منبه تذكير"], [Timer, "stopwatch", "مؤقت"],
    [Hourglass, "wait pending", "انتظار"], [Bell, "notification alert", "اشعار تنبيه"], [Search, "find magnifier", "بحث"], [Settings, "gear preferences", "اعدادات"], [SlidersHorizontal, "controls filter", "تحكم"],
    [Filter, "funnel", "تصفية"], [Menu, "hamburger navigation", "قائمة"], [Ellipsis, "more dots", "المزيد"], [Plus, "add new", "اضافة جديد"], [Minus, "remove less", "ناقص"],
    [Check, "done tick", "تم صح"], [CircleCheck, "success complete", "نجاح اكتمال"], [CircleX, "error cancel", "خطأ الغاء"], [X, "close", "اغلاق"], [Info, "information", "معلومات"],
    [CircleQuestionMark, "help question", "مساعدة سؤال"], [Eye, "view visible", "عرض اظهار"], [EyeOff, "hidden hide", "اخفاء"], [Copy, "duplicate", "نسخ"], [Trash2, "delete bin", "حذف سلة"],
    [Pencil, "edit write", "تعديل قلم"], [Download, "save", "تنزيل"], [Upload, "send file", "رفع"], [Share2, "share", "مشاركة"], [Link, "url chain", "رابط"], [Paperclip, "attachment", "مرفق"],
    [Lock, "secure private", "قفل خاص"], [LockOpen, "unlock", "فتح"], [Key, "password access", "مفتاح كلمة مرور"], [Shield, "protection", "درع حماية"], [ShieldCheck, "verified secure", "حماية موثقة"],
    [Power, "on off", "تشغيل"], [Zap, "lightning fast energy", "برق سريع طاقة"], [Sparkles, "magic ai new", "لمعان سحر ذكاء"], [Lightbulb, "idea tip", "فكرة"], [Target, "goal aim", "هدف"],
    [Puzzle, "plugin extension", "اضافة"], [LayoutGrid, "grid apps", "شبكة تطبيقات"], [LayoutDashboard, "dashboard overview", "لوحة"], [List, "items rows", "قائمة"], [ListTodo, "tasks todo", "مهام"],
    [ListChecks, "checklist", "قائمة تحقق"], [Layers, "stack levels", "طبقات"], [Fingerprint, "identity biometric", "بصمة"], [QrCode, "scan code", "رمز"], [Barcode, "scan product", "باركود"],
  ]),
  ...group("files", [
    [File, "document", "ملف"], [FileText, "document text", "مستند نص"], [Files, "documents copies", "ملفات"], [FileSpreadsheet, "excel csv table", "جدول بيانات"], [FileImage, "picture", "ملف صورة"],
    [FileCode, "source code", "ملف برمجي"], [FileJson, "json data", "ملف جيسون"], [FileArchive, "zip compressed", "ملف مضغوط"], [Folder, "directory", "مجلد"], [FolderOpen, "directory open", "مجلد مفتوح"],
    [FolderKanban, "project board", "مشروع لوحة"], [Archive, "archived box storage", "ارشيف"], [Inbox, "incoming", "وارد"], [Newspaper, "news article", "اخبار مقال"], [Notebook, "notes journal", "دفتر ملاحظات"],
    [StickyNote, "note memo", "ملاحظة"], [ClipboardList, "list form", "حافظة قائمة"], [ClipboardCheck, "approved checklist", "حافظة موافقة"], [Book, "manual", "كتاب"], [BookOpen, "reading docs", "كتاب مفتوح"],
    [Library, "collection", "مكتبة"], [Printer, "print", "طابعة"], [Table, "grid rows", "جدول"],
  ]),
  ...group("communication", [
    [Mail, "email message", "بريد رسالة"], [MailOpen, "read email", "بريد مفتوح"], [Send, "submit paper plane", "ارسال"], [MessageSquare, "chat comment", "محادثة تعليق"], [MessageCircle, "chat bubble", "رسالة"],
    [Phone, "call", "هاتف اتصال"], [Video, "meeting camera film clip", "فيديو اجتماع"], [Mic, "microphone voice", "ميكروفون صوت"], [Megaphone, "announce campaign", "اعلان حملة"], [AtSign, "mention email", "اشارة"],
    [Globe, "web world internet", "عالم انترنت"], [Languages, "translate language", "لغات ترجمة"], [Bot, "assistant robot ai", "روبوت مساعد"], [Handshake, "deal partner", "اتفاق شراكة"],
  ]),
  ...group("business", [
    [Building2, "company office organization", "شركة مكتب مؤسسة"], [Briefcase, "work job", "حقيبة عمل"], [Landmark, "bank government", "بنك حكومة"], [Factory, "industry manufacturing", "مصنع صناعة"],
    [Warehouse, "storage inventory", "مستودع مخزن"], [Store, "shop retail", "متجر"], [School, "education", "مدرسة"], [GraduationCap, "student academy", "تخرج اكاديمية"], [Award, "prize badge", "جائزة"],
    [Medal, "rank", "ميدالية"], [Trophy, "winner", "كأس فوز"], [Crown, "premium king", "تاج مميز"], [Rocket, "launch startup", "صاروخ اطلاق"], [Flame, "hot trending", "لهب شائع"],
    [Diamond, "gem value", "الماس"], [Anchor, "harbor stable", "مرساة"], [LifeBuoy, "support help", "دعم"],
  ]),
  ...group("commerce", [
    [Wallet, "money", "محفظة"], [CreditCard, "payment card", "بطاقة دفع"], [Banknote, "cash money", "نقد"], [Coins, "money change", "عملات"], [Receipt, "invoice bill", "ايصال فاتورة"],
    [ShoppingCart, "basket buy", "سلة تسوق"], [ShoppingBag, "purchase", "حقيبة تسوق"], [Package, "parcel product", "طرد منتج"], [Boxes, "inventory", "صناديق"], [Box, "container", "صندوق"],
    [Truck, "delivery shipping", "توصيل شحن"], [Gift, "present reward", "هدية"], [Percent, "discount", "خصم"], [DollarSign, "currency price", "دولار سعر"],
  ]),
  ...group("data", [
    [ChartBar, "bar graph analytics", "مخطط اعمدة تحليلات"], [ChartLine, "line graph trend", "مخطط خطي"], [ChartPie, "pie share", "مخطط دائري"], [TrendingUp, "growth increase", "نمو ارتفاع"],
    [TrendingDown, "decline decrease", "انخفاض"], [Activity, "pulse heartbeat", "نشاط"], [Database, "storage sql", "قاعدة بيانات"], [Server, "hosting", "خادم"], [HardDrive, "disk storage", "قرص"],
    [Cpu, "processor chip", "معالج"], [Wifi, "network wireless", "شبكة"], [Blocks, "modules building", "وحدات"], [Shapes, "objects", "اشكال"],
  ]),
  ...group("people", [
    [User, "person profile account", "مستخدم شخص حساب"], [UserRound, "person avatar", "شخص"], [Users, "team group people", "فريق مجموعة"], [Smile, "happy face", "ابتسامة سعيد"], [ThumbsUp, "approve like", "موافقة اعجاب"],
    [Hand, "stop wave", "يد"], [Baby, "child", "طفل"],
  ]),
  ...group("dev", [
    [Code, "programming brackets", "برمجة كود"], [Terminal, "console shell cli", "طرفية"], [Braces, "json object", "اقواس"], [GitBranch, "version control", "فرع"], [GitPullRequest, "merge review", "طلب دمج"],
    [Bug, "issue defect", "خلل خطأ برمجي"], [Plug, "integration connect api", "توصيل تكامل"], [Laptop, "computer", "حاسوب محمول"], [Monitor, "screen desktop", "شاشة"], [Smartphone, "mobile phone", "جوال"],
    [Keyboard, "typing", "لوحة مفاتيح"], [Mouse, "pointer", "فأرة"], [Battery, "power charge", "بطارية"], [Wrench, "tool fix settings", "مفتاح صيانة"], [Hammer, "build tool", "مطرقة بناء"],
    [Atom, "science react", "ذرة"], [Brain, "intelligence ai", "دماغ ذكاء"],
  ]),
  ...group("media", [
    [Image, "picture photo", "صورة"], [Camera, "photo", "كاميرا"], [Film, "movie cinema", "فيلم سينما"], [Music, "audio song", "موسيقى"], [Headphones, "listen audio", "سماعات"],
    [Play, "start media", "تشغيل"], [Pause, "stop media", "ايقاف مؤقت"], [Tv, "television screen", "تلفاز"], [Gamepad2, "games controller", "العاب"],
  ]),
  ...group("design", [
    [Palette, "colors paint", "الوان"], [Brush, "paint art", "فرشاة"], [PenTool, "vector draw", "قلم رسم"], [Scissors, "cut", "مقص"], [Ruler, "measure", "مسطرة"], [Hexagon, "shape", "سداسي"],
  ]),
  ...group("nature", [
    [Sun, "day light weather", "شمس طقس"], [Moon, "night dark", "قمر ليل"], [Cloud, "weather storage", "سحابة"], [CloudRain, "rain weather", "مطر"], [Snowflake, "cold winter", "ثلج شتاء"],
    [Umbrella, "rain cover", "مظلة"], [Wind, "air breeze", "رياح"], [Droplet, "water liquid", "قطرة ماء"], [Leaf, "plant eco green", "ورقة نبات"], [TreePine, "forest tree", "شجرة"],
    [Flower2, "bloom garden", "زهرة"], [Mountain, "peak outdoor", "جبل"], [Waves, "sea water", "امواج بحر"], [Recycle, "sustainable eco", "تدوير"], [Bird, "animal", "طائر"], [Fish, "animal sea", "سمكة"],
  ]),
  ...group("travel", [
    [Car, "vehicle drive", "سيارة"], [Bus, "transport", "حافلة"], [Bike, "cycle", "دراجة"], [Plane, "flight airport", "طائرة سفر"], [Ship, "boat cruise", "سفينة"], [Fuel, "gas station", "وقود"],
    [Map, "directions", "خريطة"], [Compass, "direction explore", "بوصلة"], [Navigation, "gps route", "ملاحة"], [Telescope, "explore discover", "تلسكوب"], [Tent, "camping", "خيمة"],
  ]),
  ...group("health", [
    [HeartPulse, "health heartbeat", "صحة نبض"], [Stethoscope, "doctor medical", "سماعة طبيب"], [Pill, "medicine", "دواء"], [FlaskConical, "lab science chemistry", "مختبر كيمياء"], [Dumbbell, "fitness gym", "لياقة"],
    [Coffee, "drink cafe", "قهوة"], [Utensils, "food restaurant", "طعام مطعم"], [Pizza, "food", "بيتزا"], [Apple, "fruit food", "تفاحة"], [Beer, "drink", "مشروب"], [Wine, "drink", "عصير"], [Cake, "birthday party", "كعكة عيد ميلاد"],
  ]),
];
