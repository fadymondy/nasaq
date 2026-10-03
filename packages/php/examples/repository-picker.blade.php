<div x-data="{
        repos: [
            { id: '1', fullName: 'acme/storefront', description: 'The customer storefront', language: 'TypeScript', defaultBranch: 'main', stars: 128 },
            { id: '2', fullName: 'acme/billing-api', private: true, language: 'Go', defaultBranch: 'main', stars: 12 },
            { id: '3', fullName: 'acme/design-tokens', language: 'CSS', defaultBranch: 'trunk', stars: 54 },
        ],
        branches: [{ name: 'main', default: true, protected: true }, { name: 'develop' }, { name: 'feat/checkout' }],
    }"
    x-on:nq-repo-search="$event.detail.wait(Promise.resolve(repos.filter((r) => r.fullName.includes($event.detail.query.toLowerCase()))))"
    x-on:nq-repo-branches="$event.detail.wait(Promise.resolve(branches))">
    <x-nq::repository-picker :account="['login' => 'acme']" configure />
</div>
