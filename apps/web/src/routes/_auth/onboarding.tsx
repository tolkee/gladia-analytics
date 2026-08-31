import { SiteHeader } from "#components/site-header";
import { createOrganisationMutation } from "#features/organisations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "@gladia-analytics/ui/components/button";
import { Input } from "@gladia-analytics/ui/components/input";
import { ArrowRight02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const organisationFormSchema = z.object({
  name: z.string().trim().min(1, "Enter an organisation name.").max(120),
});

type OrganisationForm = z.infer<typeof organisationFormSchema>;

export const Route = createFileRoute("/_auth/onboarding")({
  beforeLoad: ({ context }) => {
    if (context.organisations.length > 0) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const {
    mutateAsync: createOrganisation,
    error,
    isPending,
    reset,
  } = useMutation(createOrganisationMutation.options(user.id));
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OrganisationForm>({
    resolver: zodResolver(organisationFormSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });
  const organisationNameField = register("name");

  const errorMessage = errors.name?.message ?? error?.response.message;

  async function onSubmit(organisation: OrganisationForm) {
    try {
      await createOrganisation(organisation);
      await router.invalidate();
      await router.navigate({ to: "/" });
    } catch {
      // The mutation error is displayed below the input.
    }
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-12">
        <section className="w-full max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Create your organisation</h1>

          <form className="mt-6 space-y-2" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  {...organisationNameField}
                  id="organisation-name"
                  className="h-14 px-4 text-lg md:text-lg"
                  onChange={(event) => {
                    void organisationNameField.onChange(event);
                    reset();
                  }}
                  placeholder="Organisation name"
                  autoComplete="organization"
                  autoFocus
                  required
                  maxLength={120}
                  disabled={isPending}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? "organisation-name-error" : undefined}
                />
                {errorMessage && (
                  <p id="organisation-name-error" className="text-sm text-destructive" role="alert">
                    {errorMessage}
                  </p>
                )}
              </div>
              <Button
                className="size-14 shrink-0"
                type="submit"
                size="icon-lg"
                disabled={!isValid || isPending}
                aria-label="Create organisation"
              >
                <HugeiconsIcon
                  icon={isPending ? Loading03Icon : ArrowRight02Icon}
                  className={isPending ? "animate-spin" : undefined}
                  strokeWidth={2}
                />
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
