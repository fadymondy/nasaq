<x-nq::auth-layout title="Sign in" description="Use your work email to continue.">
    <p class="text-center text-body-sm text-muted-foreground">The sign-in form goes here.</p>
    <x-slot:prompt>Don't have an account? <a href="/sign-up">Create one</a></x-slot:prompt>
    <x-slot:footer><x-nq::auth-layout.footer :links="[['label' => 'Terms', 'href' => '/terms'], ['label' => 'Privacy', 'href' => '/privacy']]" /></x-slot:footer>
</x-nq::auth-layout>
