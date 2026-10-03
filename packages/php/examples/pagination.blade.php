<div class="flex flex-col items-start gap-6">
    <x-nq::pagination :page-count="24" :page="3" />
    <x-nq::pagination.cursor-pager :from="21" :to="40" :total="95" :has-previous="true" :has-next="true" />
    <x-nq::pagination.load-more />
</div>
