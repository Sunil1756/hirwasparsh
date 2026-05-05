import { motion } from "framer-motion";
import { TreePine, Users, Globe, Target, Heart, Zap } from "lucide-react";

const values = [
  { icon: <Heart className="h-8 w-8" />, title: "Sustainability", desc: "Every action we take is guided by environmental sustainability" },
  { icon: <Users className="h-8 w-8" />, title: "Community", desc: "Building green communities that grow together" },
  { icon: <Zap className="h-8 w-8" />, title: "Innovation", desc: "Using AI and satellite tech for smarter environmental action" },
  { icon: <Globe className="h-8 w-8" />, title: "Transparency", desc: "Every plantation is verified and tracked openly" },
];

const About = () => (
  <div className="min-h-screen pt-24">
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <TreePine className="h-4 w-4" /> About Us
          </div>
          <h1 className="font-heading text-5xl font-bold mb-6">About Green Enlightenment</h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Green Enlightenment is a technology-driven platform designed to increase tree plantation, track environmental impact, and build green communities using AI, satellite monitoring, and community participation.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our mission is to connect citizens, schools, NGOs, governments, and corporate CSR programs on a single platform to collectively drive reforestation and environmental sustainability.
          </p>
        </motion.div>
      </div>
    </section>

    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-3xl font-bold text-center mb-12">Our Values</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }} className="glass-card rounded-2xl p-6 text-center">
              <div className="text-primary mb-3 flex justify-center">{v.icon}</div>
              <h3 className="font-heading font-semibold mb-2">{v.title}</h3>
              <p className="text-muted-foreground text-sm">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-8 w-8 text-primary" />
          <h2 className="font-heading text-3xl font-bold">Our Target Users</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {["Citizens & Volunteers", "Schools & Colleges", "NGOs", "Government Departments", "Corporate CSR Programs", "Environmental Activists"].map((u) => (
            <div key={u} className="glass-card rounded-lg p-4 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium">{u}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default About;
