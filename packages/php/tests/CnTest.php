<?php

namespace Nasaq\Tests;

use Nasaq\Cn;
use PHPUnit\Framework\TestCase as Base;

class CnTest extends Base
{
    public function test_later_classes_win_in_their_group(): void
    {
        $this->assertSame('animate-spin size-6', Cn::merge('size-4 animate-spin', 'size-6'));
        $this->assertSame('text-label text-danger', Cn::merge('text-label text-foreground', 'text-danger'));
        $this->assertSame('text-foreground text-body', Cn::merge('text-label text-foreground', 'text-body'));
        $this->assertSame('rounded-full', Cn::merge('rounded-control', 'rounded-full'));
        $this->assertSame('p-4', Cn::merge('px-2 py-1', 'p-4'));
        $this->assertSame('h-control hover:bg-b', Cn::merge('h-control hover:bg-a', 'hover:bg-b'));
        $this->assertSame('bg-a hover:bg-b', Cn::merge('bg-a', 'hover:bg-b'));
        $this->assertSame('border border-danger', Cn::merge('border border-border', 'border-danger'));
        $this->assertSame('h-[calc(var(--nq-control)+8px)] px-5', Cn::merge('h-control', 'h-[calc(var(--nq-control)+8px)] px-5'));
    }

    public function test_axis_utilities_do_not_collide_with_their_shorthand(): void
    {
        $this->assertSame('gap-y-1 gap-x-4', Cn::merge('gap-x-2 gap-y-1', 'gap-x-4'));
        $this->assertSame('gap-3', Cn::merge('gap-x-2', 'gap-3'));
        $this->assertSame('overflow-y-hidden overflow-x-scroll', Cn::merge('overflow-x-auto overflow-y-hidden', 'overflow-x-scroll'));
    }

    public function test_ring_width_and_colour_are_separate(): void
    {
        $this->assertSame('ring-2 ring-primary/30', Cn::merge('ring-2', 'ring-primary/30'));
        $this->assertSame('ring-primary ring-4', Cn::merge('ring-2 ring-primary', 'ring-4'));
        $this->assertSame('ring-offset-2 ring-offset-background', Cn::merge('ring-offset-2', 'ring-offset-background'));
    }

    public function test_unknown_classes_are_kept(): void
    {
        $this->assertSame('data-[open]:x [&_svg]:size-4 custom', Cn::merge('data-[open]:x [&_svg]:size-4', 'custom'));
    }
}
