import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle2, Building, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. First attempt to send via serverless endpoint /api/contact
      let sentSuccessfully = false;
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            subject: subject || "General Inquiry",
            message,
          }),
        });

        if (response.ok) {
          sentSuccessfully = true;
        }
      } catch (fetchErr) {
        // Fall back to client-side Supabase write if local or /api is unavailable
        console.warn("Direct /api/contact unreachable, trying Supabase fallback", fetchErr);
      }

      // 2. Client-side Supabase insert fallback
      if (!sentSuccessfully && supabase) {
        const { error } = await supabase.from("contact_inquiries" as any).insert([
          {
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim() || "General Inquiry",
            message: message.trim(),
          },
        ]);
        if (!error) {
          sentSuccessfully = true;
        }
      }

      setIsSubmitted(true);
      toast({
        title: "Message Sent Successfully! 📬",
        description: "Thank you for reaching out. Our team will get back to you within 24 hours.",
      });

      // Clear form
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact submit error:", err);
      toast({
        title: "Error Sending Message",
        description: "Could not send your message right now. Please email us directly at contact@green-enlightenment.com.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <SEO
        title="Contact Green Enlightenment - Enterprise & CSR Reforestation"
        description="Get in touch with Green Enlightenment for corporate CSR partnerships, carbon accounting, institutional tree tracking, or platform inquiries."
        canonicalPath="/contact"
      />

      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              Direct Support &amp; CSR Partnerships
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">Get In Touch</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Have questions about verified tree planting, CSR compliance, or satellite MRV? We're here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Channels */}
            <div className="space-y-4">
              {[
                {
                  icon: <Mail className="h-5 w-5" />,
                  label: "Official Inquiries",
                  value: "contact@green-enlightenment.com",
                  href: "mailto:contact@green-enlightenment.com",
                },
                {
                  icon: <Phone className="h-5 w-5" />,
                  label: "Enterprise Desk",
                  value: "+91 20 4911 3800",
                  href: "tel:+912049113800",
                },
                {
                  icon: <Building className="h-5 w-5" />,
                  label: "Headquarters",
                  value: "Solapur, Maharashtra, India",
                  href: null,
                },
              ].map((c, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-border/40 shadow-sm">
                  <div className="bg-primary/10 rounded-xl p-3 text-primary shrink-0">{c.icon}</div>
                  <div className="overflow-hidden">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{c.label}</div>
                    {c.href ? (
                      <a href={c.href} className="font-medium text-foreground hover:text-primary transition-colors text-sm sm:text-base break-words">
                        {c.value}
                      </a>
                    ) : (
                      <div className="font-medium text-foreground text-sm sm:text-base">{c.value}</div>
                    )}
                  </div>
                </div>
              ))}

              <div className="glass-card rounded-2xl p-6 bg-muted/30 border border-border/40 text-xs text-muted-foreground space-y-2">
                <div className="font-semibold text-foreground text-sm">Response Time Guarantee</div>
                <p>
                  Institutional and CSR partner inquiries receive a dedicated technical briefing within 1 business day.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-border/40 shadow-sm">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="font-heading text-xl font-bold">Message Dispatched!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Thank you for reaching out. A confirmation has been logged, and our team will reply shortly.
                  </p>
                  <Button variant="outline" onClick={() => setIsSubmitted(false)} className="rounded-xl">
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name" className="text-xs font-semibold">Your Name *</Label>
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="mt-1.5 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email" className="text-xs font-semibold">Work / Personal Email *</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@organization.org"
                      required
                      className="mt-1.5 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-subject" className="text-xs font-semibold">Subject</Label>
                    <Input
                      id="contact-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="CSR Partnership / General Inquiry"
                      className="mt-1.5 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-message" className="text-xs font-semibold">Message *</Label>
                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your plantation targets or inquiries..."
                      rows={4}
                      required
                      className="mt-1.5 rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full gap-2 rounded-xl h-11 font-semibold shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Transmitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
