/* Fake notes (English and Arabic) and the demos of the notes components. Nothing here talks to a server. */
import { type Note, NoteEditor, type NoteResult, Notes, NotesView, type Notebook, type NotePatch } from "@nasaq/web";
import { useCallback, useRef, useState } from "react";
import { useAr, wait } from "./_profile-demo";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

/** The password of the sealed demo notes. It protects nothing: the body is plain text in this file. */
export const DEMO_PASSWORD = "nasaq";

export const demoNotebooks = (ar: boolean): Notebook[] =>
  ar
    ? [
        { id: "work", name: "العمل" },
        { id: "clients", name: "العملاء", parentId: "work" },
        { id: "personal", name: "شخصي" },
        { id: "ideas", name: "أفكار" },
      ]
    : [
        { id: "work", name: "Work" },
        { id: "clients", name: "Clients", parentId: "work" },
        { id: "personal", name: "Personal" },
        { id: "ideas", name: "Ideas" },
      ];

export const demoNotes = (ar: boolean): Note[] =>
  ar
    ? [
        { id: "n1", title: "خطة الإطلاق", notebookId: "work", tags: ["إطلاق", "مهم"], color: "amber", pinned: true, createdAt: ago(9 * DAY), updatedAt: ago(20 * MIN), body: "<h2>الأهداف</h2><p>إطلاق النسخة الأولى قبل نهاية الشهر. راجع أيضًا [[اجتماع الأسبوع]] و[[قائمة التسوق]].</p><ul><li>تجهيز صفحة الهبوط</li><li>اختبار الدفع</li><li>إعلان للعملاء</li></ul>" },
        { id: "n2", title: "اجتماع الأسبوع", notebookId: "clients", tags: ["اجتماع"], color: "blue", pinned: true, createdAt: ago(3 * DAY), updatedAt: ago(3 * HOUR), body: "<p>الحضور: سارة، ومحمود، وليلى.</p><p>القرار: نبدأ بالعملاء الحاليين، ثم نفتح التسجيل. الخطة في [[خطة الإطلاق]].</p>" },
        { id: "n3", title: "قائمة التسوق", notebookId: "personal", tags: ["منزل"], color: "green", createdAt: ago(2 * DAY), updatedAt: ago(26 * HOUR), format: "markdown", body: "# قائمة التسوق\n\n- [ ] خبز\n- [x] قهوة\n- [ ] **فواكه** طازجة\n\nانظر أيضًا [[خطة الإطلاق]]." },
        { id: "n4", title: "رمز الدخول", notebookId: "personal", tags: ["خاص"], sealed: true, color: "violet", createdAt: ago(20 * DAY), updatedAt: ago(5 * DAY), body: "<p>رمز الخزنة التجريبي: 4821. هذا نص تجريبي فقط.</p>" },
        { id: "n5", title: "فكرة تطبيق للملاحظات الصوتية", notebookId: "ideas", tags: ["فكرة"], createdAt: ago(12 * DAY), updatedAt: ago(9 * DAY), body: "<p>تسجيل صوتي قصير يتحول إلى نص مع وسوم تلقائية.</p>" },
        { id: "n6", title: "ملاحظات قديمة", tags: ["أرشيف"], archived: true, createdAt: ago(60 * DAY), updatedAt: ago(45 * DAY), body: "<p>ملاحظات من مشروع سابق.</p>" },
      ]
    : [
        { id: "n1", title: "Launch plan", notebookId: "work", tags: ["launch", "important"], color: "amber", pinned: true, createdAt: ago(9 * DAY), updatedAt: ago(20 * MIN), body: "<h2>Goals</h2><p>Ship the first version before the end of the month. See also [[Weekly sync]] and [[Shopping list]].</p><ul><li>Prepare the landing page</li><li>Test payments</li><li>Announce to customers</li></ul>" },
        { id: "n2", title: "Weekly sync", notebookId: "clients", tags: ["meeting"], color: "blue", pinned: true, createdAt: ago(3 * DAY), updatedAt: ago(3 * HOUR), body: "<p>Present: Sara, Mahmoud and Layla.</p><p>Decision: start with current customers, then open sign-ups. The plan is in [[Launch plan]].</p>" },
        { id: "n3", title: "Shopping list", notebookId: "personal", tags: ["home"], color: "green", createdAt: ago(2 * DAY), updatedAt: ago(26 * HOUR), format: "markdown", body: "# Shopping list\n\n- [ ] Bread\n- [x] Coffee\n- [ ] **Fresh** fruit\n\nAlso see [[Launch plan]]." },
        { id: "n4", title: "Vault code", notebookId: "personal", tags: ["private"], sealed: true, color: "violet", createdAt: ago(20 * DAY), updatedAt: ago(5 * DAY), body: "<p>Demo vault code: 4821. This is placeholder text only.</p>" },
        { id: "n5", title: "Voice notes app idea", notebookId: "ideas", tags: ["idea"], createdAt: ago(12 * DAY), updatedAt: ago(9 * DAY), body: "<p>A short voice memo that turns into text with automatic tags.</p>" },
        { id: "n6", title: "Old project notes", tags: ["archive"], archived: true, createdAt: ago(60 * DAY), updatedAt: ago(45 * DAY), body: "<p>Notes from a past project.</p>" },
      ];

let counter = 100;
const nextId = () => `n${++counter}`;

/** State and fake async callbacks for the notes demos. */
function useNotesStore() {
  const ar = useAr();
  const [notes, setNotes] = useState(() => demoNotes(ar));
  const [notebooks, setNotebooks] = useState(() => demoNotebooks(ar));
  const saves = useRef(0);
  const patch = useCallback((id: string, p: NotePatch) => setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...p, updatedAt: Date.now() } : n))), []);
  return {
    notes,
    notebooks,
    onUpdate: async (id: string, p: NotePatch): Promise<NoteResult> => {
      const content = p.title !== undefined || p.body !== undefined;
      await wait(content ? 500 : 150);
      // Every fifth autosave fails once, to show the error state and retry.
      if (content && ++saves.current % 5 === 0) return { error: ar ? "انقطع الاتصال" : "Connection lost" };
      patch(id, p);
    },
    onCreate: async () => {
      await wait(300);
      const id = nextId();
      setNotes((all) => [{ id, title: "", body: "", createdAt: Date.now(), updatedAt: Date.now() }, ...all]);
      return { id };
    },
    onDuplicate: async (copy: Note): Promise<NoteResult> => {
      await wait(300);
      setNotes((all) => [copy, ...all]);
    },
    onDelete: async (id: string): Promise<NoteResult> => {
      await wait(400);
      setNotes((all) => all.filter((n) => n.id !== id));
    },
    onSeal: async (id: string, password: string): Promise<NoteResult> => {
      await wait(400);
      if (password.length < 4) return { error: ar ? "كلمة المرور قصيرة" : "Password too short" };
      setNotes((all) => all.map((n) => (n.id === id ? { ...n, sealed: true, updatedAt: Date.now() } : n)));
    },
    onRemoveSeal: async (id: string, password: string): Promise<NoteResult> => {
      await wait(400);
      if (password !== DEMO_PASSWORD) return { error: ar ? "كلمة المرور غير صحيحة." : "That password is not right." };
      setNotes((all) => all.map((n) => (n.id === id ? { ...n, sealed: false, updatedAt: Date.now() } : n)));
    },
    onUnlock: async (_id: string, password: string): Promise<NoteResult> => {
      await wait(400);
      if (password !== DEMO_PASSWORD) return { error: ar ? "كلمة المرور غير صحيحة." : "That password is not right." };
    },
    shareUrl: (note: Note) => `https://notes.example.com/n/${note.id}`,
    onNotebookCreate: async (name: string, parentId: string | null): Promise<NoteResult> => {
      await wait(300);
      setNotebooks((all) => [...all, { id: `nb${++counter}`, name, parentId }]);
    },
    onNotebookRename: async (id: string, name: string): Promise<NoteResult> => {
      await wait(300);
      setNotebooks((all) => all.map((b) => (b.id === id ? { ...b, name } : b)));
    },
    onNotebookDelete: async (id: string): Promise<NoteResult> => {
      await wait(300);
      setNotebooks((all) => all.filter((b) => b.id !== id));
      setNotes((all) => all.map((n) => (n.notebookId === id ? { ...n, notebookId: null } : n)));
    },
  };
}

/** The whole notes screen (Pages/App/Notes). */
export function NotesPage() {
  const store = useNotesStore();
  return (
    <div className="h-dvh">
      <Notes {...store} defaultActiveId={null} />
    </div>
  );
}

/** Just the list and board (Components/Editors/Notes). */
export function NotesViewDemo({ defaultView = "list" }: { defaultView?: "list" | "grid" }) {
  const store = useNotesStore();
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="flex h-[36rem] max-w-3xl flex-col rounded-card border border-border">
      <NotesView {...store} activeId={active} onOpen={setActive} defaultView={defaultView} />
    </div>
  );
}

/** Just the editor for one note. */
export function NoteEditorDemo({ noteId = "n1", markdown = false }: { noteId?: string; markdown?: boolean }) {
  const store = useNotesStore();
  const [id, setId] = useState(markdown ? "n3" : noteId);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  return (
    <div className="@container flex h-[40rem] max-w-3xl rounded-card border border-border">
      <NoteEditor
        {...store}
        note={store.notes.find((n) => n.id === id)}
        unlocked={unlocked}
        onLock={(x) => setUnlocked((u) => u.filter((y) => y !== x))}
        onUnlock={async (x, p) => {
          const r = await store.onUnlock(x, p);
          if (!(r && r.error)) setUnlocked((u) => [...u, x]);
          return r;
        }}
        onOpenNote={setId}
      />
    </div>
  );
}
