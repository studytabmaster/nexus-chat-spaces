<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Quiet-hours throttling lives in src/lib/quiet-hours.ts and realtime channels disconnect while the page is hidden (usePageVisible); avoid unfiltered postgres_changes subscriptions because they fan out to every subscriber.
- Community permissions are checked in DB via has_community_perm(); custom roles can only grant permissions the creator holds (trigger guard).
