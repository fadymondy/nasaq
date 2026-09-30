import { Dropzone, FileUpload, type FileUploadControls, ImageUpload, NasaqProvider, type UploadFile, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Pickers/File upload", component: FileUpload } satisfies Meta<typeof FileUpload>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

/** Forces Arabic (RTL) regardless of the toolbar locale, so both directions are one click apart. */
function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** A fake transport: ramps progress, then finishes (or fails when the name contains "fail"). */
function simulate(item: UploadFile, controls: FileUploadControls, ar: boolean) {
  let p = 0;
  controls.update(item.id, { status: "uploading", progress: 0, error: undefined });
  const timer = setInterval(() => {
    p += 12 + Math.random() * 10;
    if (item.file.name.includes("fail") && p > 45) {
      clearInterval(timer);
      controls.update(item.id, { status: "error", error: ar ? "انقطع الاتصال أثناء الرفع." : "The connection dropped during upload." });
      return;
    }
    if (p >= 100) {
      clearInterval(timer);
      controls.update(item.id, { status: "done", progress: 100 });
      return;
    }
    controls.update(item.id, { progress: Math.round(p) });
  }, 250);
}

function Demo({ ar }: { ar: boolean }) {
  return (
    <div className="w-[30rem] max-w-full">
      <FileUpload
        accept="image/*,.pdf"
        maxSize={5 * 1024 * 1024}
        maxFiles={4}
        onFiles={(added, controls) => added.forEach((f) => simulate(f, controls, ar))}
        onRetry={(item, controls) => simulate(item, controls, ar)}
      />
      <p className="mt-3 text-caption text-muted-foreground">
        {ar ? "جرّب ملفًا اسمه fail.pdf لرؤية إعادة المحاولة." : "Try a file named fail.pdf to see retry."}
      </p>
    </div>
  );
}

/** Uncontrolled: the component keeps the list, your `onFiles` runs the upload and reports progress. */
export const Default: Story = { render: () => <Demo ar={useAr()} /> };

export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo ar />
    </ArabicScope>
  ),
};

/** `value` + `onValueChange` put the list in your state; a pre-filled list shows every status. */
export const Controlled: Story = {
  render: () => {
    const ar = useAr();
    const file = (name: string, size: number, type = "application/pdf") => new File([new Uint8Array(size)], name, { type });
    const [files, setFiles] = useState<UploadFile[]>([
      { id: "1", file: file("contract.pdf", 1_400_000), status: "done", progress: 100 },
      { id: "2", file: file("scan-2026.pdf", 3_800_000), status: "uploading", progress: 58 },
      { id: "3", file: file("عقد-الإيجار.pdf", 900_000), status: "pending", progress: 0 },
      { id: "4", file: file("logo.png", 250_000, "image/png"), status: "error", progress: 30, error: ar ? "الملف تالف." : "The file is corrupt." },
    ]);
    return (
      <div className="w-[30rem] max-w-full">
        <FileUpload value={files} onValueChange={setFiles} onRetry={(item, c) => simulate(item, c, ar)} />
      </div>
    );
  },
};

/** Validation: type, size and count. Rejections are announced and listed under the zone. */
export const Validation: Story = {
  render: () => (
    <div className="w-[30rem] max-w-full">
      <FileUpload accept=".png,.jpg" maxSize={100 * 1024} maxFiles={2} onFiles={(added, c) => added.forEach((f) => simulate(f, c, false))} />
    </div>
  ),
};

/** The bare Dropzone when you render the file list yourself. */
export const DropzoneOnly: Story = {
  render: () => {
    const ar = useAr();
    const [names, setNames] = useState<string[]>([]);
    return (
      <div className="flex w-[30rem] max-w-full flex-col gap-3">
        <Dropzone accept=".csv" onFiles={(f) => setNames(f.map((x) => x.name))}>
          {ar ? "أفلت ملف CSV هنا" : "Drop a CSV file here"}
        </Dropzone>
        <p className="text-body-sm text-muted-foreground" dir="auto">
          {names.join(", ") || (ar ? "لا شيء بعد" : "Nothing yet")}
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[30rem] max-w-full">
      <FileUpload disabled />
    </div>
  ),
};

function ImageDemo({ ar }: { ar: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | undefined>();
  function onValueChange(next: File | null) {
    setFile(next);
    setProgress(undefined);
    if (!next) return;
    let p = 0;
    setProgress(0);
    const timer = setInterval(() => {
      p += 20;
      setProgress(Math.min(p, 100));
      if (p >= 100) clearInterval(timer);
    }, 300);
  }
  return <ImageUpload value={file} onValueChange={onValueChange} progress={progress} maxSize={2 * 1024 * 1024} alt={ar ? "صورة الملف الشخصي" : "Profile picture"} />;
}

/** A single image with a thumbnail from an object URL (revoked on cleanup), replace and remove. */
export const SingleImage: Story = { render: () => <ImageDemo ar={useAr()} /> };

export const ImageArabic: Story = {
  render: () => (
    <ArabicScope>
      <ImageDemo ar />
    </ArabicScope>
  ),
};
