
import { GoogleGenAI, Type } from "@google/genai";
import { Volunteer, ServiceEvent, RoleType } from '@/types';

// Initialize Gemini Client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScheduleWithAI = async (
  volunteers: Volunteer[],
  availableRoles: string[],
  startDate: string,
  endDate: string,
  userInstructions: string
): Promise<ServiceEvent[]> => {

  const model = "gemini-2.5-flash";

  const prompt = `
    Você é um assistente administrativo de uma igreja. Sua tarefa é criar uma escala de voluntários (schedule).
    
    Data de Início: ${startDate}
    Data de Fim: ${endDate}

    Ministérios (Funções) Disponíveis:
    ${availableRoles.join(', ')}
    
    Lista de Voluntários e suas habilidades:
    ${JSON.stringify(volunteers.map(v => ({ name: v.name, roles: v.roles })))}
    
    Instruções Adicionais do Usuário: "${userInstructions}"
    
    Regras:
    1. Crie eventos (cultos) para os domingos dentro do intervalo de datas.
    2. Tente preencher as funções (Ministérios) disponíveis para cada culto. NÃO invente funções que não estejam na lista de Ministérios Disponíveis.
    3. Respeite as habilidades (roles) de cada voluntário.
    4. Distribua a carga de trabalho de forma justa.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            services: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Data do evento no formato ISO 8601 YYYY-MM-DD" },
                  title: { type: Type.STRING, description: "Nome do evento (ex: Culto de Domingo)" },
                  assignments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        role: { type: Type.STRING, description: "Função exercida (deve ser um dos ministérios disponíveis)" },
                        volunteerName: { type: Type.STRING, description: "Nome exato do voluntário da lista fornecida" }
                      },
                      required: ["role", "volunteerName"]
                    }
                  }
                },
                required: ["date", "title", "assignments"]
              }
            }
          },
          required: ["services"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No content generated");
    
    const parsed = JSON.parse(jsonText);
    
    // Map response back to application structure (linking names to IDs)
    const newServices: ServiceEvent[] = parsed.services.map((svc: any, index: number) => {
      const validAssignments = svc.assignments.map((assignment: any) => {
        const vol = volunteers.find(v => v.name === assignment.volunteerName);
        if (!vol) return null;
        return {
          role: assignment.role as RoleType,
          volunteerId: vol.id
        };
      }).filter(Boolean);

      return {
        id: `ai-gen-${Date.now()}-${index}`,
        date: svc.date,
        title: svc.title,
        assignments: validAssignments
      };
    });

    return newServices;

  } catch (error) {
    console.error("Error generating schedule:", error);
    throw error;
  }
};