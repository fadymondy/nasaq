{{-- <x-nq::github-activity.sha :sha="$commit['id']" :href="$commit['href'] ?? null" />
     The seven-character commit sha, always left to right, linked when there is an href. Internal to <x-nq::github-activity>. --}}
@props(['sha', 'href' => null])
<x-nq::github-activity.ref :href="$href"><code dir="ltr" class="rounded-sm bg-secondary px-1 py-0.5 font-mono text-code text-muted-foreground">{{ substr($sha, 0, 7) }}</code></x-nq::github-activity.ref>
