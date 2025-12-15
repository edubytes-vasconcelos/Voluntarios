
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

// Declare Deno to resolve type errors in non-Deno environments
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface baseada no seu types.ts
interface Assignment {
  role: string;
  volunteerId?: string;
  teamId?: string;
  status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Configuração e Autenticação
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente incompletas.");
    }

    webpush.setVapidDetails('mailto:admin@app.com', vapidPublicKey, vapidPrivateKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Processar Payload do Webhook
    const payload = await req.json();
    console.log("Evento recebido:", payload.type);

    const { type, record, old_record } = payload;
    
    // Apenas processa INSERT ou UPDATE na tabela 'services'
    if (type !== 'INSERT' && type !== 'UPDATE') {
        return new Response(JSON.stringify({ message: "Tipo de evento ignorado" }), { headers: corsHeaders });
    }

    const newAssignments: Assignment[] = record.assignments || [];
    const oldAssignments: Assignment[] = old_record?.assignments || [];

    // 3. Identificar quem precisa ser notificado
    // Queremos apenas voluntários que NÃO estavam na lista antiga (novos escalados)
    // Ou se é um INSERT (novo culto), todos são novos.
    
    const oldVolunteerIds = new Set(oldAssignments.map(a => a.volunteerId).filter(Boolean));
    
    // Filtra voluntários que têm ID e que NÃO estavam no set antigo
    const volunteersToNotify = newAssignments.filter(a => {
        return a.volunteerId && !oldVolunteerIds.has(a.volunteerId);
    });

    if (volunteersToNotify.length === 0) {
        return new Response(JSON.stringify({ message: "Nenhum novo voluntário para notificar." }), { headers: corsHeaders });
    }

    // Extrai apenas os IDs únicos
    const targetIds = [...new Set(volunteersToNotify.map(a => a.volunteerId as string))];
    console.log(`Notificando ${targetIds.length} usuários:`, targetIds);

    // 4. Buscar assinaturas desses usuários
    const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', targetIds);

    if (subError || !subscriptions?.length) {
        console.log("Nenhuma assinatura encontrada para os usuários alvo.");
        return new Response(JSON.stringify({ message: "Sem dispositivos registrados." }), { headers: corsHeaders });
    }

    // 5. Enviar Notificações
    const dateFormatted = new Date(record.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const notificationTitle = `Nova Escala: ${record.title}`;
    
    const results = await Promise.all(subscriptions.map(async (sub) => {
        // Personaliza a mensagem com a função (role)
        const myAssignment = volunteersToNotify.find(a => a.volunteerId === sub.user_id);
        const roleName = myAssignment?.role || 'Voluntário';
        const notificationBody = `Você foi escalado para atuar em: ${roleName} no dia ${dateFormatted}.`;

        try {
            await webpush.sendNotification(
                sub.subscription, 
                JSON.stringify({ 
                    title: notificationTitle, 
                    body: notificationBody,
                    url: '/' // Abre o app ao clicar
                })
            );
            return { success: true, id: sub.user_id };
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Remove assinatura inválida
                await supabase.from('push_subscriptions').delete().match({ subscription: sub.subscription });
            }
            return { success: false, error: error.message };
        }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Erro fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
