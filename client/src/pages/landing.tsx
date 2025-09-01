import { useState } from "react";
import mobileAppMockup from "@/assets/Mobile_app_interface_mockup_eddc62bd.png";
import brainVisualization from "@/assets/Premium_brain_visualization_hero_c991f018.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientButton } from "@/components/ui/gradient-button";
import { FeatureCard } from "@/components/feature-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleAuth = () => {
    // Navigate to Replit Auth
    window.location.href = '/api/login';
  };

  const handleLogoClick = () => {
    // Update URL to remove any hash fragments and go back to root
    window.history.pushState({}, '', '/');
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    {
      icon: <i className="fas fa-gamepad text-2xl text-primary"></i>,
      title: "Multiple Cognitive Games",
      description: "Diverse collection of brain games targeting memory, logic, attention, and problem-solving skills with engaging gameplay.",
    },
    {
      icon: <i className="fas fa-chart-line text-2xl text-accent"></i>,
      title: "Adaptive Difficulty",
      description: "Smart algorithms automatically adjust game difficulty based on your performance to keep you in the optimal challenge zone.",
    },
    {
      icon: <i className="fas fa-chart-bar text-2xl text-chart-3"></i>,
      title: "Progress Tracking",
      description: "Comprehensive dashboard displays your cognitive improvements over time with detailed analytics and insights.",
    },
    {
      icon: <i className="fas fa-user-cog text-2xl text-chart-4"></i>,
      title: "Personalized Training Plans",
      description: "AI-powered daily training routines customized to your goals, strengths, and areas for improvement.",
    },
    {
      icon: <i className="fas fa-clock text-2xl text-chart-5"></i>,
      title: "Brief Sessions",
      description: "Quick 2-5 minute training sessions designed to fit seamlessly into your busy daily routine.",
    },
    {
      icon: <i className="fas fa-microscope text-2xl text-primary"></i>,
      title: "Science Based Design",
      description: "Every game is built on proven cognitive science principles and validated through peer-reviewed research.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-effect border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
              data-testid="button-logo"
            >
              <i className="fas fa-brain text-2xl text-primary"></i>
              <span className="text-xl font-bold text-foreground">BrainBoost</span>
            </button>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#science" className="text-muted-foreground hover:text-foreground transition-colors">Science</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={handleSignIn}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
              <GradientButton
                onClick={handleGetStarted}
                className="px-6 py-2 rounded-lg font-medium"
                data-testid="button-get-started"
              >
                Get Started
              </GradientButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center gradient-hero overflow-hidden">
        {/* Background geometric patterns */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary rounded-full blur-xl floating-element"></div>
          <div className="absolute bottom-40 right-20 w-48 h-48 bg-accent rounded-full blur-2xl floating-element"></div>
          <div className="absolute top-60 right-10 w-24 h-24 bg-primary rounded-full blur-lg floating-element"></div>
          <div className="absolute top-1/3 left-1/3 w-16 h-16 bg-chart-3 rounded-full blur-lg floating-element"></div>
          <div className="absolute bottom-1/4 left-1/4 w-20 h-20 bg-chart-4 rounded-full blur-xl floating-element"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Train Your Brain<br />Unlock Your Potential
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                Science-based cognitive training games designed to improve memory, focus, and mental agility. 
                Start your journey to a sharper mind in just 2 minutes a day.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <GradientButton
                  onClick={handleGetStarted}
                  className="px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
                  data-testid="button-train-brain-now"
                >
                  <i className="fas fa-rocket"></i>
                  Train Your Brain Now
                </GradientButton>
                <Button
                  variant="outline"
                  className="border-2 border-border text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-muted"
                  data-testid="button-watch-demo"
                >
                  Watch Demo
                </Button>
              </div>
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <i className="fas fa-check-circle text-primary"></i>
                  <span>Free 7-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-users text-primary"></i>
                  <span>10M+ users</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-star text-primary"></i>
                  <span>4.8/5 rating</span>
                </div>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <img
                src={mobileAppMockup}
                alt="Premium mobile app interface showing brain training games"
                className="rounded-3xl premium-shadow w-full max-w-md mx-auto"
              />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-accent/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30 neural-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-primary">Boost Your Brain</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive cognitive training platform combines cutting-edge neuroscience with engaging gameplay
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
            
            {/* Premium Access Feature */}
            <FeatureCard
              icon={<i className="fas fa-crown text-2xl text-primary"></i>}
              title="Premium Access"
              description="Unlock the complete brain training experience with advanced games, detailed analytics, and exclusive features."
              isPremium={true}
              className="lg:col-start-2"
            />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Millions Worldwide</h2>
            <p className="text-xl text-muted-foreground">Join the global community improving their cognitive abilities</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2" data-testid="stat-users">10M+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2" data-testid="stat-improvement">15%</div>
              <div className="text-muted-foreground">Average Improvement</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-chart-3 mb-2" data-testid="stat-rating">4.8/5</div>
              <div className="text-muted-foreground">User Rating</div>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden premium-shadow">
            <img
              src={brainVisualization}
              alt="Futuristic brain visualization with neural networks representing cognitive science"
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/80 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-3xl font-bold mb-4">Built on Real Science</h3>
                <p className="text-xl opacity-90 max-w-2xl">Our games are developed using validated cognitive training principles from leading neuroscience research institutions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section id="science" className="py-24 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Science Behind BrainBoost</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our brain training games are built on decades of cognitive neuroscience research and proven training methodologies
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 premium-shadow">
              <CardContent className="p-0 text-center">
                <i className="fas fa-brain text-4xl text-primary mb-6"></i>
                <h3 className="text-xl font-semibold mb-4">Neuroplasticity</h3>
                <p className="text-muted-foreground">
                  Our games leverage the brain's ability to form new neural connections throughout life, enhancing cognitive abilities through targeted practice.
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-8 premium-shadow">
              <CardContent className="p-0 text-center">
                <i className="fas fa-chart-line text-4xl text-accent mb-6"></i>
                <h3 className="text-xl font-semibold mb-4">Adaptive Training</h3>
                <p className="text-muted-foreground">
                  Research shows that training at optimal difficulty levels maximizes cognitive gains. Our algorithms adjust in real-time to keep you challenged.
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-8 premium-shadow">
              <CardContent className="p-0 text-center">
                <i className="fas fa-medal text-4xl text-chart-3 mb-6"></i>
                <h3 className="text-xl font-semibold mb-4">Validated Results</h3>
                <p className="text-muted-foreground">
                  Clinical studies demonstrate measurable improvements in working memory, attention, and processing speed after consistent training.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              Research partnerships with Stanford University, MIT, and the National Institute of Health
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Training Plan</h2>
            <p className="text-xl text-muted-foreground">
              Start free and upgrade when you're ready for advanced features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 premium-shadow">
              <CardContent className="p-0">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="text-4xl font-bold text-muted-foreground mb-4">$0</div>
                  <p className="text-muted-foreground">Perfect for getting started</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>3 basic games</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Basic progress tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Daily challenges</span>
                  </li>
                </ul>
                <Button
                  onClick={handleGetStarted}
                  variant="outline"
                  className="w-full py-3"
                  data-testid="button-select-free"
                >
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
            
            {/* Premium Plan */}
            <Card className="p-8 premium-shadow bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-0">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <div className="text-4xl font-bold text-primary mb-4">$9.99<span className="text-lg text-muted-foreground">/mo</span></div>
                  <p className="text-muted-foreground">Complete brain training experience</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>All 15+ games</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Personalized training plans</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Progress reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>No ads</span>
                  </li>
                </ul>
                <GradientButton
                  onClick={handleGetStarted}
                  className="w-full py-3"
                  data-testid="button-select-premium"
                >
                  Start Premium Trial
                </GradientButton>
              </CardContent>
            </Card>
            
            {/* Annual Plan */}
            <Card className="p-8 premium-shadow">
              <CardContent className="p-0">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Annual</h3>
                  <div className="text-4xl font-bold text-accent mb-1">$79.99<span className="text-lg text-muted-foreground">/year</span></div>
                  <div className="text-sm text-primary font-medium mb-4">Save 33%</div>
                  <p className="text-muted-foreground">Best value for committed learners</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Everything in Premium</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Early access to new games</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <i className="fas fa-check text-primary"></i>
                    <span>Annual progress report</span>
                  </li>
                </ul>
                <Button
                  onClick={handleGetStarted}
                  variant="outline"
                  className="w-full py-3"
                  data-testid="button-select-annual"
                >
                  Choose Annual
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              30-day money-back guarantee • Cancel anytime • Secure payment via Stripe
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary to-accent">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Boost Your Brainpower?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start your free 7-day trial and experience the difference science-based training can make
          </p>
          <Button
            onClick={handleGetStarted}
            className="bg-white text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
            data-testid="button-start-training-today"
          >
            <i className="fas fa-brain"></i>
            Start Training Today
          </Button>
          <div className="mt-6 text-white/80 text-sm">
            No credit card required • Cancel anytime • Join 10M+ users
          </div>
        </div>
      </section>

      {/* Authentication Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="w-full max-w-md premium-shadow animate-scale-in">
          <DialogTitle className="text-center text-2xl font-bold text-card-foreground">
            {authMode === 'login' ? 'Welcome Back' : 'Start Your Journey'}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {authMode === 'login' 
              ? 'Sign in to continue your brain training journey'
              : 'Create your account and begin training'
            }
          </DialogDescription>
          <div className="text-center mb-8">
            <i className="fas fa-brain text-3xl text-primary mb-4"></i>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="w-full"
                placeholder="your@email.com"
                data-testid="input-email"
              />
            </div>
            {authMode === 'signup' && (
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-2">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="w-full"
                  placeholder="John Doe"
                  data-testid="input-name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                className="w-full"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>
            <GradientButton
              onClick={handleAuth}
              className="w-full py-3 rounded-xl font-semibold"
              data-testid={`button-${authMode}`}
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </GradientButton>
          </div>
          
          <div className="mt-6 text-center">
            <span className="text-muted-foreground">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <Button
              variant="link"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-primary hover:underline font-medium p-0"
              data-testid={`button-switch-to-${authMode === 'login' ? 'signup' : 'login'}`}
            >
              {authMode === 'login' ? 'Sign up' : 'Sign in'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
