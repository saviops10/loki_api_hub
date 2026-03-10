import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/Button';
import { LokiIcon } from '../../components/Branding';

export const LandingPage: React.FC<{ onGetStarted: () => void, onRegister: () => void, onAbout: () => void, onPlans: () => void }> = ({ onGetStarted, onRegister, onAbout, onPlans }) => {
  const [selectedPlan, setSelectedPlan] = React.useState('Business');

  return (
    <div className="min-h-screen bg-loki-bg text-[#f5f5f5] selection:bg-loki-primary/30">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_#151a3b_0,_#050816_55%)] pointer-events-none" />

      <div className="relative max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-3">
            <LokiIcon className="w-8 h-8" />
            <span className="font-bold tracking-widest uppercase text-sm">Loki API Hub</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm text-zinc-400 font-medium">
            <a href="#como-funciona" className="hover:text-loki-accent transition-colors">Como funciona</a>
            <a href="#recursos" className="hover:text-loki-accent transition-colors">Recursos</a>
            <a href="#planos" onClick={(e) => { e.preventDefault(); onPlans(); }} className="hover:text-loki-accent transition-colors">Planos</a>
            <a href="#faq" className="hover:text-loki-accent transition-colors">FAQ</a>
          </nav>
          <Button variant="secondary" size="sm" onClick={onGetStarted} className="hidden sm:flex">
            Entrar
          </Button>
        </header>

        {/* Hero Section */}
        <section className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center py-16 lg:py-24 border-b border-white/10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-loki-accent uppercase tracking-[0.2em] text-xs font-bold">
              Plataforma de Integrações
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Loki API Hub:<br />
              <span className="text-loki-accent">domine o caos</span> das integrações.
            </h1>
            <p className="text-zinc-400 text-lg max-w-lg leading-relaxed">
              Centralize, teste e gerencie todas as APIs da sua empresa em um único lugar.
              Menos planilhas, menos falhas, mais velocidade, segurança e controle.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-zinc-400 bg-white/5">▶ Reduz integrações de semanas para minutos</span>
              <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-zinc-400 bg-white/5">🔐 Gestão inteligente de chaves e tokens</span>
              <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-zinc-400 bg-white/5">👨‍💻 Feito para Devs, TI e Diretoria</span>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" onClick={onRegister} className="bg-gradient-to-r from-loki-primary to-loki-accent text-zinc-950 border-none shadow-xl shadow-loki-primary/20 px-8">
                Criar conta gratuita
              </Button>
              <Button size="lg" variant="outline" onClick={onAbout} className="border-white/20 text-zinc-400 hover:border-loki-accent hover:text-loki-accent">
                Agendar demonstração
              </Button>
            </div>

            <p className="text-xs text-zinc-500">
              Sem cartão de crédito • Ambiente seguro de testes • Planos Free, Business e Custom
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-[radial-gradient(circle_at_top,_#2d2c60_0,_#050816_60%)] rounded-3xl border border-white/10 p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-loki-primary/50" />
              </div>
              <span>Loki CLI – Maestro Digital</span>
            </div>
            <div className="bg-[#050816]/80 rounded-xl p-5 border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-x-auto">
              <div className="text-loki-primary">$ loki login</div>
              <div className="text-zinc-500 mb-2">✔ Autenticado com sucesso.</div>
              
              <div className="text-loki-primary">$ loki apis:list</div>
              <div className="text-zinc-500 mb-2">✔ 23 integrações ativas encontradas.</div>

              <div className="text-loki-primary">$ loki healthcheck --all</div>
              <div className="text-zinc-500">✔ Pagamentos OK</div>
              <div className="text-zinc-500">✔ ERP OK</div>
              <div className="text-zinc-500">✔ Logística OK</div>
              <div className="text-red-400 mb-2">! Banco de dados legado – latência alta</div>

              <div className="text-loki-primary">$ loki keys:rotate --provider=banco</div>
              <div className="text-zinc-500 mb-4">✔ Token renovado. Logs atualizados.</div>

              <div className="text-loki-accent font-bold">&gt; Loki API Hub — o camaleão que se adapta a qualquer API.</div>
            </div>
          </motion.div>
        </section>

        {/* Problema Section */}
        <section id="problema" className="py-16 border-b border-white/5">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold mb-2">O problema</div>
          <h2 className="text-3xl font-bold mb-4">Integrações hoje são lentas, caras e frágeis.</h2>
          <p className="text-zinc-400 max-w-2xl mb-12">
            Cada novo sistema exige uma nova gambiarra. Documentações diferentes, chaves espalhadas em planilhas,
            dependência de um ou dois devs “que sabem como funciona”. O resultado? Risco, retrabalho e bloqueio de crescimento.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0b1020] p-8 rounded-2xl border border-white/5">
              <h3 className="text-lg font-bold mb-6">Se parece com a sua realidade?</h3>
              <ul className="space-y-4">
                {[
                  'Integrações que levam semanas ou meses para sair do papel.',
                  'APIs críticas documentadas apenas na cabeça do time.',
                  'Chaves e tokens espalhados entre e-mails, chats e planilhas.',
                  'Ambiente de produção sendo usado como “laboratório de testes”.',
                  'Erros intermitentes que ninguém sabe de onde vêm.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="text-[#00f5c8] mt-1">⦿</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0b1020] p-8 rounded-2xl border border-white/5">
              <h3 className="text-lg font-bold mb-6">Impacto direto no negócio</h3>
              <ul className="space-y-4">
                {[
                  'Perda de oportunidades por demorar a integrar novos parceiros.',
                  'Custo elevado de manutenção e suporte técnico.',
                  'Risco de falhas de segurança e acessos indevidos.',
                  'Dependência de poucas pessoas-chave para tudo funcionar.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="text-[#00f5c8] mt-1">⦿</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Solução Section */}
        <section id="como-funciona" className="py-16 border-b border-white/5">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold mb-2">A solução</div>
          <h2 className="text-3xl font-bold mb-4">Loki API Hub: o maestro digital das integrações.</h2>
          <p className="text-zinc-400 max-w-2xl mb-12">
            Loki API Hub é a camada que organiza, protege e orquestra todas as conexões da sua empresa.
            Uma plataforma única para conectar, testar, monitorar e escalar suas integrações com segurança.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0b1020] p-8 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-lg font-bold">Painel centralizado de integrações</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Visualize todas as conexões em um só painel: status, logs, consumo, chaves e permissões.
                Chega de caçar informações em múltiplos sistemas.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Visão 360º das APIs', 'Status em tempo real', 'Ambientes separados'].map(tag => (
                  <span key={tag} className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-zinc-500">{tag}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#0b1020] p-8 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-lg font-bold">Automação inteligente de acessos</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Deixe o Loki “conversar” com as APIs para você. A plataforma aprende o fluxo de autenticação,
                renova tokens automaticamente e garante que apenas as pessoas certas tenham acesso.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Rotação automática', 'Gestão de API Keys', 'Permissões por time'].map(tag => (
                  <span key={tag} className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-zinc-500">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Recursos Section */}
        <section id="recursos" className="py-16 border-b border-white/5">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold mb-2">Recursos principais</div>
          <h2 className="text-3xl font-bold mb-12">Tudo o que seu time precisa para integrar com confiança.</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tag: 'Painel 360º',
                title: 'Central de comando',
                desc: 'Veja todas as APIs, status, falhas e consumo em um único painel intuitivo.',
                items: ['Mapa completo das conexões.', 'Filtros por sistema.', 'Alertas de falhas críticas.']
              },
              {
                tag: 'Teste em tempo real',
                title: 'Ambiente seguro',
                desc: 'Teste novas ideias sem tocar no ambiente principal, com simulações e respostas em tempo real.',
                items: ['Sandbox controlado.', 'Testes antes de produção.', 'Logs dedicados.']
              },
              {
                tag: 'Logs completos',
                title: 'Histórico detalhado',
                desc: 'Tenha transparência total das requisições: o que foi enviado, o que voltou e quando.',
                items: ['Facilita auditorias.', 'Acelera correção de bugs.', 'Reduz tempo de suporte.']
              },
              {
                tag: 'Segurança',
                title: 'Gestão de chaves',
                desc: 'Controle granular de quem acessa o quê, com limites por plano e por time.',
                items: ['Chaves por cliente/time.', 'Revogação rápida.', 'Políticas por plano.']
              },
              {
                tag: 'Loki CLI',
                title: 'Poder técnico',
                desc: 'Uma CLI poderosa para automação, deploys e integração com pipelines de CI/CD.',
                items: ['Comandos simples.', 'Scripts repetitivos.', 'Integração DevOps.']
              },
              {
                tag: 'Escalabilidade',
                title: 'Pronto para crescer',
                desc: 'Da startup ao enterprise: a infraestrutura do Loki acompanha o seu volume.',
                items: ['Alta disponibilidade.', 'Multi-times.', 'Planos customizáveis.']
              }
            ].map((feature, i) => (
              <div key={i} className="bg-[#0b1020] p-6 rounded-2xl border border-white/5 space-y-4">
                <span className="text-[10px] text-loki-accent font-bold uppercase tracking-widest">{feature.tag}</span>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{feature.desc}</p>
                <ul className="space-y-2 pt-2">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-[11px] text-zinc-400">
                      <span className="text-loki-accent">⦿</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Planos Section */}
        <section id="planos" className="py-16 border-b border-white/5">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold mb-2">Planos</div>
          <h2 className="text-3xl font-bold mb-4">Escalabilidade que cabe no seu negócio.</h2>
          <p className="text-zinc-400 max-w-2xl mb-12">
            Comece testando no modo Free e evolua para planos Business ou Custom conforme o volume e criticidade das suas integrações aumentam.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tag: 'Para começar',
                name: 'Free',
                price: 'R$ 0',
                sub: 'ideal para testes',
                features: ['Até 5 integrações ativas.', 'Painel básico.', 'Ambiente sandbox.', 'Logs limitados.'],
                cta: 'Criar conta gratuita',
                primary: false
              },
              {
                tag: 'Mais popular',
                name: 'Business',
                price: 'Sob consulta',
                sub: 'para times em crescimento',
                features: ['Integrações ilimitadas.', 'Automação avançada.', 'Logs ampliados.', 'Suporte prioritário.'],
                cta: 'Falar com vendas',
                primary: true
              },
              {
                tag: 'Enterprise',
                name: 'Custom',
                price: 'Sob medida',
                sub: 'para grandes operações',
                features: ['Arquitetura personalizada.', 'SLAs dedicados.', 'Governança multi-times.', 'Consultoria.'],
                cta: 'Agendar conversa',
                primary: false
              }
            ].map((plan, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedPlan(plan.name)}
                className={`bg-[#0b1020] p-8 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${selectedPlan === plan.name ? 'border-loki-accent shadow-2xl shadow-loki-primary/10 scale-[1.02]' : 'border-white/5 hover:border-white/20'}`}
              >
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{plan.tag}</div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{plan.price}</div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{plan.sub}</div>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="text-loki-accent">✔</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    plan.name === 'Free' ? onRegister() : onAbout();
                  }}
                  className={`w-full mt-10 transition-all ${selectedPlan === plan.name ? 'bg-gradient-to-r from-loki-primary to-loki-accent text-zinc-950' : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:border-loki-accent hover:text-loki-accent'}`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 border-b border-white/5">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold mb-2">FAQ</div>
          <h2 className="text-3xl font-bold mb-12">Perguntas frequentes.</h2>

          <div className="grid gap-4 max-w-3xl">
            {[
              {
                q: 'Loki API Hub substitui meus sistemas atuais?',
                a: 'Não. A Loki API Hub é uma camada de orquestração e gestão das integrações. Ela se conecta aos sistemas que você já usa para centralizar, monitorar e automatizar o relacionamento entre eles.'
              },
              {
                q: 'Preciso ter um time técnico para usar o Loki?',
                a: 'A plataforma foi pensada tanto para perfis técnicos quanto de gestão. Desenvolvedores podem usar a Loki CLI, enquanto gestores acompanham tudo pelo painel visual.'
              },
              {
                q: 'É seguro centralizar minhas chaves e tokens na Loki?',
                a: 'Sim. Segurança é um dos pilares centrais. Trabalhamos com criptografia, segregação de acessos, rotação de tokens e trilhas de auditoria.'
              }
            ].map((item, i) => (
              <div key={i} className="bg-[#0b1020] p-6 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold mb-2">{item.q}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 text-center space-y-8">
          <div className="text-loki-accent uppercase tracking-[0.2em] text-[10px] font-bold">Próximo passo</div>
          <h2 className="text-4xl font-bold">Pronto para dominar o caos das integrações?</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            A Loki API Hub está pronta para ser o maestro digital da sua empresa.
            Comece grátis, teste com segurança e evolua no seu ritmo.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" onClick={onRegister} className="bg-gradient-to-r from-loki-primary to-loki-accent text-zinc-950 border-none px-12">
              Criar conta gratuita
            </Button>
            <Button size="lg" variant="outline" onClick={onAbout} className="border-white/20 text-zinc-400">
              Falar com o time Loki
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-t border-white/5">
          <div>© {new Date().getFullYear()} Loki API Hub. Todos os direitos reservados.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-loki-accent transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-loki-accent transition-colors">Política de privacidade</a>
          </div>
        </footer>
      </div>
    </div>
  );
};
