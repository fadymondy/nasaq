<?php

namespace Nasaq\Tests;

use Illuminate\Support\Facades\Blade;
use Nasaq\DesktopPowerMenu;

/** Parity with the React components after main moved on: button pill, avatar initials, loading shapes, boxicons, power menu. */
class GapParityTest extends TestCase
{
    public function test_button_pill_is_fully_rounded_with_more_padding_and_a_hook(): void
    {
        $html = Blade::render('<x-nq::button shape="pill" size="lg">Go</x-nq::button>');
        $this->assertStringContainsString('data-shape="pill"', $html);
        $this->assertMatchesRegularExpression('/class="[^"]*\brounded-full\b/', $html);
        $this->assertMatchesRegularExpression('/class="[^"]*\bpx-7\b/', $html);
        $this->assertDoesNotMatchRegularExpression('/class="[^"]*\brounded-control\b/', $html);

        $link = Blade::render('<x-nq::button shape="pill" variant="link">Go</x-nq::button>');
        $this->assertMatchesRegularExpression('/class="[^"]*\brounded-control\b/', $link);
        $this->assertDoesNotMatchRegularExpression('/class="[^"]*\brounded-full\b/', $link);

        $plain = Blade::render('<x-nq::button>Go</x-nq::button>');
        $this->assertStringNotContainsString('data-shape', $plain);
        $this->assertMatchesRegularExpression('/class="[^"]*\brounded-control\b/', $plain);
    }

    public function test_avatar_initials_skip_leading_punctuation(): void
    {
        $this->assertStringContainsString('>TD</span>', Blade::render('<x-nq::avatar name="(Test) Driver" />'));
        $this->assertStringContainsString('>F</span>', Blade::render('<x-nq::avatar name="- Fady" />'));
        $this->assertStringContainsString('>FM</span>', Blade::render('<x-nq::avatar name="Fady Mondy" />'));
        $this->assertStringContainsString('>نع</span>', Blade::render('<x-nq::avatar name="«نور» عادل" />'));
    }

    public function test_loading_state_shapes_and_caption(): void
    {
        $rows = Blade::render('<x-nq::states.loading :rows="2" />');
        $this->assertStringContainsString('data-shape="rows"', $rows);
        $this->assertStringContainsString('class="sr-only">Loading…', $rows);

        $grid = Blade::render('<x-nq::states.loading shape="grid" :rows="3" :columns="4" caption="Fetching…" />');
        $this->assertSame(3, substr_count($grid, 'data-slot="loading-card"'));
        $this->assertStringContainsString('sm:grid-cols-4', $grid);
        $this->assertStringNotContainsString('class="sr-only">Loading…', $grid);
        $this->assertStringContainsString('Fetching…</p>', $grid);

        $timeline = Blade::render('<x-nq::states.loading shape="timeline" :rows="3" />');
        $this->assertSame(3, substr_count($timeline, 'data-slot="loading-event"'));
        $this->assertSame(2, substr_count($timeline, 'start-[9px]'));

        $spinner = Blade::render('<x-nq::states.loading :rows="0" caption="Saving…" />');
        $this->assertStringContainsString('data-slot="spinner"', $spinner);
        $this->assertStringContainsString('class="sr-only">Saving…', $spinner);
    }

    public function test_icon_by_name_draws_lucide_boxicons_images_and_the_slot(): void
    {
        $this->assertStringContainsString('<svg', Blade::render('<x-nq::icon-picker.by-name name="Users" />'));
        $bx = Blade::render('<x-nq::icon-picker.by-name name="bxs:Star" class="text-xl" />');
        $this->assertStringContainsString('data-slot="icon-boxicon"', $bx);
        $this->assertMatchesRegularExpression('/class="bx [^"]*bxs-star[^"]*text-xl"/', $bx);
        $this->assertStringContainsString('font-size: 1em', $bx);
        $this->assertStringContainsString('font-size: 24px', Blade::render('<x-nq::icon-picker.by-name name="bx-home" :size="24" />'));
        $this->assertStringContainsString('data-slot="icon-image"', Blade::render('<x-nq::icon-picker.by-name name="https://x.test/a.svg" />'));
        $this->assertStringContainsString('fallback', Blade::render('<x-nq::icon-picker.by-name name="nope">fallback</x-nq::icon-picker.by-name>'));
    }

    public function test_desktop_power_menu_groups_confirms_and_translates(): void
    {
        $menu = DesktopPowerMenu::make(['appName' => 'ToGO', 'confirm' => true]);
        $this->assertSame('system', $menu['id']);
        $this->assertSame('System', $menu['label']);
        $this->assertSame(['about', 'settings', 'sleep', 'restart', 'shutDown', 'logOut'], array_column($menu['items'], 'id'));
        $this->assertSame('About ToGO', $menu['items'][0]['label']);
        $this->assertSame([false, false, true, false, false, true], array_map(fn ($i) => ! empty($i["separated"]), $menu["items"]));
        $this->assertTrue($menu['items'][5]['danger']);
        $this->assertArrayNotHasKey('confirm', $menu['items'][2]);
        $this->assertSame('Shut down now?', $menu['items'][4]['confirm']['title']);
        $this->assertFalse($menu['items'][3]['confirm']['danger']);

        $subset = DesktopPowerMenu::make(['actions' => ['sleep', 'logOut']]);
        $this->assertSame(['sleep', 'logOut'], array_column($subset['items'], 'id'));
        $this->assertArrayNotHasKey('confirm', $subset['items'][1]);

        $this->assertSame('النظام', DesktopPowerMenu::make(['locale' => 'ar'])['label']);
    }

    public function test_feedback_launcher_movable_renders_hooks_and_the_saved_spot(): void
    {
        $plain = Blade::render('<x-nq::feedback-reporter />');
        $this->assertStringNotContainsString('data-movable', $plain);
        $this->assertStringNotContainsString('x-data', $plain);
        $this->assertStringContainsString('data-position="bottom-end"', $plain);

        $html = Blade::render('<x-nq::feedback-reporter movable />');
        $this->assertStringContainsString('data-movable', $html);
        $this->assertStringContainsString('x-data="nqFeedbackLauncher(', $html);
        $this->assertStringContainsString('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"', $html);
        $this->assertStringContainsString('title="Drag to move it out of the way. Alt + arrow keys move it too."', $html);
        $this->assertMatchesRegularExpression('/class="[^"]*\btouch-none\b/', $html);
        $this->assertStringContainsString('nasaq-feedback-launcher', $html);

        $placed = Blade::render(<<<'B'
            <x-nq::feedback-reporter movable shape="tab" :spot="['side' => 'start', 'y' => 0.3]" />
            B);
        $this->assertStringContainsString('data-side="start"', $placed);
        $this->assertStringNotContainsString('data-position="edge', $placed);
        $this->assertStringContainsString('top: 30%', $placed);
        $this->assertStringContainsString('inset-inline-start: 0px', $placed);
        $this->assertMatchesRegularExpression('/class="[^"]*-translate-y-1\/2/', $placed);
        $this->assertMatchesRegularExpression('/class="[^"]*\brounded-e-card\b/', $placed);
    }

    public function test_feedback_hub_mine_tab_yours_badge_and_load_more(): void
    {
        $html = Blade::render(<<<'B'
            <x-nq::feedback-reporter.hub :has-more="true" :counts="['all' => 7]"
                :issues="[['id' => 'a', 'title' => 'Theirs', 'status' => 'open', 'author' => 'Sara'], ['id' => 'b', 'title' => 'Mine', 'status' => 'open', 'mine' => true, 'author' => 'Me']]" />
            B);
        $this->assertStringContainsString('>Mine<', $html);
        $this->assertStringContainsString('Yours', $html);
        $this->assertStringNotContainsString('by Me', $html);
        $this->assertStringContainsString('by Sara', $html);
        $this->assertSame(1, substr_count($html, ' data-mine'));
        $this->assertStringContainsString('Showing 2 of 7', $html);
        $this->assertStringContainsString('Load more', $html);
        $this->assertStringContainsString('You have not reported anything', $html);
        $this->assertStringContainsString('flex-wrap', $html);

        $none = Blade::render(<<<'B'
            <x-nq::feedback-reporter.hub :issues="[['id' => 'a', 'title' => 'T', 'status' => 'open']]" />
            B);
        $this->assertStringNotContainsString('>Mine<', $none);
        $this->assertStringNotContainsString('Load more', $none);
        $this->assertStringContainsString('>Mine<', Blade::render('<x-nq::feedback-reporter.hub :issues="[]" :mine-tab="true" />'));
    }

    public function test_issue_card_due_state_vote_toggle_and_counts(): void
    {
        $issue = ['id' => 'i1', 'key' => 'NQ-1', 'title' => 'Fix it', 'type' => 'bug', 'priority' => 'high', 'dueDate' => '2026-10-02', 'assigneeId' => 'p1'];
        $people = [['id' => 'p1', 'name' => 'Sara Ali']];
        $html = Blade::render('<x-nq::issue-view.card :issue="$issue" :people="$people" :votes="4" voteable :comments="2" now="2026-10-01" />', compact('issue', 'people'));
        $this->assertStringContainsString('data-slot="issue-card"', $html);
        $this->assertStringContainsString('data-due="soon"', $html);
        $this->assertStringContainsString('data-slot="issue-card-vote"', $html);
        $this->assertStringContainsString('nq-issue-vote', $html);
        $this->assertStringContainsString('2 comments', $html);
        $this->assertStringContainsString('Assigned to Sara Ali', $html);

        $late = Blade::render('<x-nq::issue-view.card :issue="$issue" now="2026-10-09" />', compact('issue'));
        $this->assertStringContainsString('data-due="overdue"', $late);
        $done = Blade::render('<x-nq::issue-view.card :issue="$issue" :open="false" now="2026-10-09" />', compact('issue'));
        $this->assertStringNotContainsString('data-due="overdue"', $done);
        $this->assertStringNotContainsString('issue-card-vote', $done);
    }
}
