import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const aiGenClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const prompt = `
  Você é um Treinador de Elite Mundial e Cientista do Esporte de referência.
  Sua missão é criar uma PERIODIZAÇÃO INDIVIDUALIZADA e ALTAMENTE ESTRUTURADA para o atleta Teste.
  - Modalidade: Jiu Jitsu
  - Sexo: Masculino
  - Idade: 25 anos
  Lista de datas cronológicas para gerar treinos:
  - 2026-06-20
  - 2026-06-22
  Retorne APENAS um array JSON válido de objetos de treino para as datas do cronograma fornecido, no formato JSON especificado.
`;

async function testSchema() {
  try {
    const response = await aiGenClient.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "A data correspondente do cronograma fornecido (formato YYYY-MM-DD)" },
              name: { type: Type.STRING, description: "Nome técnico estruturado do treino" },
              phase: { type: Type.STRING, description: "Fase de treinamento (Preparação Geral, Preparação Específica, ou Polimento / Tapering)" },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nome do exercício" },
                    muscleGroup: { type: Type.STRING, description: "Grupo muscular ou valência física trabalhada" },
                    sets: { type: Type.INTEGER, description: "Número de séries" },
                    reps: { type: Type.STRING, description: "Repetições (Ex: '8-10', 'Até a falha', '20s')" },
                    weight: { type: Type.STRING, description: "Sugestão de Carga/Intensidade (Ex: '70% 1RM', 'Carga Moderada', 'Peso do corpo', '35kg')" }
                  },
                  required: ["name", "muscleGroup", "sets", "reps", "weight"]
                }
              }
            },
            required: ["date", "name", "phase", "exercises"]
          }
        }
      }
    });
    console.log("Response text:", response.text);
  } catch (err: any) {
    console.error("Test error:", err);
  }
}

testSchema();
