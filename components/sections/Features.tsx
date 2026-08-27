"use client";

import { motion } from "framer-motion";
import { features } from "@/lib/content";
import { Card } from "@/components/ui/Card";

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Qué te espera</h2>
        <p className="mt-2 text-gray-400">Todo lo que hace a Barrio Bravo un server distinto.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Card title={feature.title} description={feature.description} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
