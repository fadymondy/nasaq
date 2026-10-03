{{-- <x-nq::github-activity.branch name="main" />   A branch or tag name, always left to right. Internal to <x-nq::github-activity>. --}}
@props(['name'])
<span dir="ltr" class="inline-flex max-w-48 items-center gap-1 truncate font-mono text-code text-muted-foreground"><x-lucide-git-branch aria-hidden="true" class="size-3 shrink-0" /><bdi class="truncate">{{ $name }}</bdi></span>
