import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message Sent! 📬", description: "We'll get back to you soon." });
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl font-bold mb-2">Get In Touch</h1>
            <p className="text-muted-foreground">Have questions? We'd love to hear from you.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {[
                { icon: <Mail className="h-5 w-5" />, label: "Email", value: "hello@hirwasparsh.com" },
                { icon: <Phone className="h-5 w-5" />, label: "Phone", value: "+91 98765 43210" },
                { icon: <MapPin className="h-5 w-5" />, label: "Address", value: "Pune, Maharashtra, India" },
              ].map((c, i) => (
                <div key={i} className="glass-card rounded-xl p-5 flex items-center gap-4">
                  <div className="bg-primary/10 rounded-lg p-3 text-primary">{c.icon}</div>
                  <div>
                    <div className="text-sm text-muted-foreground">{c.label}</div>
                    <div className="font-medium">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="Your name" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" required />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea placeholder="Your message..." rows={4} required />
              </div>
              <Button type="submit" className="w-full gap-2"><Send className="h-4 w-4" /> Send Message</Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
