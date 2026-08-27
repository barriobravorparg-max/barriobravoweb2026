"use client";

import { motion } from "framer-motion";
import { staff } from "@/lib/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TiltCard } from "@/components/ui/TiltCard";

export function Staff() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">El equipo</h2>
        <p className="mt-2 text-gray-400">La gente detrás de Barrio Bravo RP.</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {staff.map((member, i) => (
          <motion.div
            key={member.alias}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="text-center"
          >
            {/* TODO: imagen — staff-{alias}.jpg, 400x400px, ver spec §3.7 */}
            <TiltCard>
              <ImagePlaceholder
                aspectClassName="aspect-square"
                label={`Avatar de ${member.alias}`}
                todo={`staff-${member.alias.toLowerCase()}.jpg, 400x400px`}
                className="rounded-full"
              />
            </TiltCard>
            <p className="mt-3 font-display text-lg uppercase text-white">{member.alias}</p>
            <p className="text-sm text-gray-500">{member.role}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
