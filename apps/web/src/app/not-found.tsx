import { AppShell, PageTitle } from '@/components/app-shell';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <AppShell>
      <PageTitle
        eyebrow="404"
        title="Nothing at this address"
        lead="The page may have moved. If someone sent you a room link, check the code with them."
      />
      <div className="flex gap-3">
        <ButtonLink href="/join">Join with a code</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </AppShell>
  );
}
