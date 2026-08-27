"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // No-op: sin backend en este sub-proyecto. Se conecta a Supabase en el
    // sub-proyecto de auth + cuenta.
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">No te lo pierdas</h2>
      <p className="mt-2 text-gray-400">Enterate apenas abramos la whitelist.</p>

      {submitted ? (
        <p className="mt-6 text-cyan">¡Gracias! Te avisamos apenas abramos inscripciones.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="tu@email.com"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-white outline-none focus:border-purple"
          />
          <Button type="submit" variant="primary">
            Avisenme
          </Button>
        </form>
      )}
    </section>
  );
}
