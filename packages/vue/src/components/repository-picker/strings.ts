export const REPOSITORY_PICKER_STRINGS = {
  en: {
    repository: "Repository",
    branch: "Branch",
    pickRepository: "Choose a repository",
    pickBranch: "Choose a branch",
    searchRepositories: "Search repositories",
    searchBranches: "Filter branches",
    noRepositories: "No repositories match",
    noRepositoriesHint: "Check the spelling, or give the GitHub app access to more repositories.",
    noBranches: "No branches match",
    private: "Private",
    default: "Default",
    protected: "Protected",
    updated: "Updated",
    loading: "Loading",
    failed: "Could not load. Check your connection.",
    retry: "Try again",
    connectedAs: (login: string) => `Through the GitHub app on ${login}`,
    configure: "Configure access",
    branchesLoading: "Loading branches",
    results: (n: string) => `${n} results`,
    chooseRepoFirst: "Choose a repository first",
  },
  ar: {
    repository: "المستودع",
    branch: "الفرع",
    pickRepository: "اختر مستودعًا",
    pickBranch: "اختر فرعًا",
    searchRepositories: "ابحث في المستودعات",
    searchBranches: "صفِّ الفروع",
    noRepositories: "لا مستودعات مطابقة",
    noRepositoriesHint: "تحقق من الكتابة، أو امنح تطبيق GitHub صلاحية على مستودعات أكثر.",
    noBranches: "لا فروع مطابقة",
    private: "خاص",
    default: "الافتراضي",
    protected: "محمي",
    updated: "حُدّث",
    loading: "جارٍ التحميل",
    failed: "تعذّر التحميل. تحقق من اتصالك.",
    retry: "حاول مرة أخرى",
    connectedAs: (login: string) => `عبر تطبيق GitHub على ${login}`,
    configure: "ضبط الصلاحيات",
    branchesLoading: "جارٍ تحميل الفروع",
    results: (n: string) => `${n} نتيجة`,
    chooseRepoFirst: "اختر مستودعًا أولًا",
  },
};
export type RepositoryPickerLabels = typeof REPOSITORY_PICKER_STRINGS.en;

export interface PickerRepo {
  id: string;
  /** `owner/name`. Shown left-to-right. */
  fullName: string;
  description?: string;
  private?: boolean;
  language?: string;
  defaultBranch?: string;
  stars?: number;
  updatedAt?: Date | number | string;
}

export interface PickerBranch {
  name: string;
  default?: boolean;
  protected?: boolean;
}

/** The GitHub app installation the picker searches through. */
export interface PickerAccount {
  login: string;
  avatar?: string;
}

export interface RepositoryPickerValue {
  repo: PickerRepo | null;
  /** Branch name. Chosen for you (the default branch) when a repository is picked. */
  branch: string | null;
}
