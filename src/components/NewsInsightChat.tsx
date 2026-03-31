import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Article } from '@/lib/supabase';
import { NewsChatMessage, NEWS_CHAT_SUGGESTIONS, requestNewsChatAnswer } from '@/lib/news-chat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Bot, LoaderCircle, Send, Sparkles } from 'lucide-react';

interface NewsInsightChatProps {
  article: Article | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function createIntroMessage(article: Article): NewsChatMessage {
  return {
    role: 'assistant',
    content: `Kérdezz bármit erről a hírről: "${String(article.title || 'ez a hír')}". Már most tudok dolgozni az összefoglalóval, a figyelmeztetési szinttel, a hangulattal és a témacímkékkel, backend AI végponttal pedig még mélyebb elemzést adok.`,
  };
}

function splitTopics(topics: unknown): string[] {
  if (Array.isArray(topics)) {
    return topics.map((topic) => String(topic).trim()).filter(Boolean);
  }

  if (typeof topics !== 'string') return [];

  return topics.split(',').map((topic) => topic.trim()).filter(Boolean);
}

export default function NewsInsightChat({ article, open, onOpenChange }: NewsInsightChatProps) {
  const [messages, setMessages] = useState<NewsChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const topics = useMemo(() => splitTopics(article?.topics), [article?.topics]);

  useEffect(() => {
    if (!article || !open) return;
    setMessages([createIntroMessage(article)]);
    setDraft('');
  }, [article, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function submitQuestion(question: string) {
    if (!article) return;

    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const userMessage: NewsChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft('');
    setIsSending(true);

    const reply = await requestNewsChatAnswer({
      article,
      question: trimmed,
      history: nextMessages,
    });

    setMessages((current) => [...current, reply]);
    setIsSending(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitQuestion(draft);
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    await submitQuestion(draft);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-primary/20 bg-card/95 p-0 backdrop-blur-xl">
        {article && (
          <div className="grid max-h-[85vh] grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-border/50 bg-muted/20 p-5 lg:border-b-0 lg:border-r">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <DialogTitle className="font-display text-base tracking-wide">
                    AI HÍRELEMZŐ CHAT
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs leading-relaxed">
                  Merülj el egy konkrét hírben anélkül, hogy kilépnél a vezérlőpultról.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Kiválasztott hír
                  </p>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">
                    {String(article.title || 'Cím nélküli hír')}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{String(article.source || 'Ismeretlen forrás')}</Badge>
                  <Badge variant="outline">{String(article.warning_level || 'alacsony')} riasztás</Badge>
                  {article.affects_hungary && <Badge variant="destructive">Magyar hatás</Badge>}
                </div>

                <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Összefoglaló
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {typeof article.summary === 'string' && article.summary.trim()
                      ? article.summary
                      : 'Ehhez a cikkhez még nincs mentett összefoglaló.'}
                  </p>
                </div>

                {topics.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Témák
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Próbáld megkérdezni
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {NEWS_CHAT_SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        variant="outline"
                        className="justify-start whitespace-normal border-border/50 bg-background/30 text-left text-xs"
                        onClick={() => void submitQuestion(suggestion)}
                        disabled={isSending}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <section className="flex min-h-[560px] flex-col">
              <div className="border-b border-border/50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  Hírsegéd
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  A legjobb eredményt backendhez kötött Groq végponttal adja. Addig az alkalmazásban már betöltött cikkadatokkal dolgozik.
                </p>
              </div>

              <ScrollArea className="flex-1 px-5 py-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                    >
                      <div
                        className={
                          message.role === 'user'
                            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground'
                            : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground'
                        }
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                        Elemzem ezt a hírt...
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSubmit} className="border-t border-border/50 p-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => void handleKeyDown(event)}
                    placeholder="Kérdezz a háttérről, következményekről, megbízhatóságról, magyar hatásról vagy arról, mi jöhet ezután..."
                    className="min-h-[96px] resize-none border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Az Enter elküldi a kérdést. A Shift+Enter új sort kezd.
                    </p>
                    <Button
                      type="submit"
                      className="gap-2"
                      disabled={isSending || !draft.trim()}
                    >
                      <Send className="h-4 w-4" />
                      Kérdezd az AI-t
                    </Button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
