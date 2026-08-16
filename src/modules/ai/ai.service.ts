import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private groqClient: Groq | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private openRouterClient: OpenAI | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (process.env.OPENROUTER_API_KEY) {
      // OpenRouter uses the exact same SDK as OpenAI, you just change the baseURL
      this.openRouterClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      });
    }
  }

  async callOpenRouter(
    prompt: string,
    systemPrompt?: string,
    model: string = 'meta-llama/llama-3.1-8b-instruct:free',
  ): Promise<string> {
    if (!this.openRouterClient) {
      throw new InternalServerErrorException(
        'OpenRouter API Key no configurada en el backend.',
      );
    }

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const completion = await this.openRouterClient.chat.completions.create({
        messages,
        model: model, // by default, uses a highly capable and 100% free model on OpenRouter
      });
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error calling OpenRouter:', error);
      throw new InternalServerErrorException(
        'Error al comunicarse con OpenRouter.',
      );
    }
  }

  async callGroq(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.groqClient) {
      throw new InternalServerErrorException(
        'Groq API Key no configurada en el backend.',
      );
    }

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const completion = await this.groqClient.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant', // or mixtral-8x7b-32768
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error calling Groq:', error);
      throw new InternalServerErrorException('Error al comunicarse con Groq.');
    }
  }

  async callGemini(
    prompt: string,
    systemPrompt?: string,
    fileBase64?: string,
    fileMimeType?: string,
  ): Promise<string> {
    if (!this.geminiClient) {
      throw new InternalServerErrorException(
        'Gemini API Key no configurada en el backend.',
      );
    }

    try {
      // Use the latest flash model
      const modelParams: any = { model: 'gemini-flash-latest' };

      // Some API Keys / Regions throw 404 if systemInstruction is used natively.
      // We prepend it to the text instead for max compatibility.
      const parts: any[] = [];
      if (systemPrompt) {
        parts.push({
          text: `[System Instruction: ${systemPrompt}]\n\nUser Request: ${prompt}`,
        });
      } else {
        parts.push({ text: prompt });
      }

      if (fileBase64 && fileMimeType) {
        // Remove standard base64 prefix if present (e.g. data:application/pdf;base64,...)
        const base64Data = fileBase64.includes(',')
          ? fileBase64.split(',')[1]
          : fileBase64;

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: fileMimeType,
          },
        });
      }

      let model = this.geminiClient.getGenerativeModel(modelParams);

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts }],
        });
        const response = await result.response;
        return response.text();
      } catch (err: any) {
        // Fallback to gemini-pro-latest if flash fails
        if (err.message && err.message.includes('404')) {
          console.warn(
            'gemini-flash-latest threw 404, falling back to gemini-pro-latest...',
          );
          model = this.geminiClient.getGenerativeModel({
            model: 'gemini-pro-latest',
          });
          const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
          });
          const response = await result.response;
          return response.text();
        }
        throw err;
      }
    } catch (error: any) {
      console.error('Error calling Gemini:', error.message);
      throw new InternalServerErrorException(
        'Error al comunicarse con Gemini: ' + error.message,
      );
    }
  }

  async generateMessage(applicationId: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        offer: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');

    const user = await this.prisma.user.findUnique({
      where: { id: application.userId },
      include: { profile: true },
    });

    const profile = user?.profile;
    const offer = application.offer;

    // This is a basic mock since actual AI integration usually requires an API key for OpenAI, etc.
    const message = `Estimado equipo de ${offer.company},
  
Me dirijo a ustedes con gran entusiasmo para presentar mi candidatura a la posición de ${offer.title}. 

${profile?.summary ? profile.summary + ' ' : ''}Al revisar los requisitos de la vacante, noté que buscan a alguien con experiencia afín a mi perfil. Estoy seguro(a) de que mi experiencia previa y habilidades pueden aportar un gran valor a su equipo.

Me encantaría tener la oportunidad de conversar sobre cómo mi trayectoria se alinea con sus objetivos. Quedo a su entera disposición para una entrevista.

Atentamente,
${user?.name || 'Candidato'}`;

    return { message };
  }

  async analyzeOffer(offerId: string, userId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) throw new NotFoundException('Offer not found');

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    const analysis = `Tu perfil tiene una gran compatibilidad con la oferta de ${offer.title} en ${offer.company}. 
Te sugerimos destacar tus conocimientos en ${offer.skills && offer.skills.length > 0 ? offer.skills.join(', ') : 'tecnologías clave'} durante la entrevista, 
así como mencionar cómo tu experiencia previa se relaciona con los requisitos de la vacante. ¡Mucho éxito!`;

    return { analysis };
  }

  async translateMessage(text: string, targetLanguage: string) {
    // This is a basic mock. In reality, you would call OpenAI API to translate the text.
    let translatedText = text;
    if (targetLanguage.toLowerCase() === 'en') {
      translatedText = `Hello team, I am writing to apply for the position... (This is a mock translation of your message to English)`;
    } else if (targetLanguage.toLowerCase() === 'es') {
      translatedText = `Hola equipo, les escribo para postular a la posición... (Esto es una traducción simulada de tu mensaje al Español)`;
    } else {
      translatedText = `(Mock Translation to ${targetLanguage}):\n${text}`;
    }

    return { translatedText };
  }

  async generateInterviewPrep(applicationId: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        offer: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');

    const offer = application.offer;

    // Mock data for interview prep
    return {
      qna: [
        {
          question: `¿Por qué te interesa el puesto de ${offer.title}?`,
          advice:
            'Muestra pasión por la empresa y el rol. Relaciona tus intereses con lo que hacen.',
          answer: `Me encanta el enfoque que tienen en ${offer.company} y siento que mis habilidades aportarán mucho al equipo.`,
        },
        {
          question: `¿Qué aportarías como ${offer.title}?`,
          advice: 'Destaca tus principales fortalezas técnicas y blandas.',
          answer: `Tengo experiencia sólida en las tecnologías que buscan y aprendo rápido.`,
        },
      ],
    };
  }

  async generateGeneralInterviewPrep(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    // Mock data for general interview prep
    return {
      qna: [
        {
          question: `Cuéntanos sobre ti y tu experiencia.`,
          advice:
            'Haz un resumen conciso de tu trayectoria profesional, destacando tus logros más relevantes.',
          answer: `Soy un profesional con enfoque en resultados. ${profile?.summary ? 'Como menciono en mi perfil: ' + profile.summary : ''}`,
        },
        {
          question: `¿Cuáles consideras que son tus mayores fortalezas técnicas?`,
          advice:
            'Menciona habilidades clave que domines y da un ejemplo breve.',
          answer: `Mis fortalezas principales incluyen ${profile?.skills?.join(', ') || 'varias herramientas de desarrollo'}.`,
        },
        {
          question: `¿Dónde te ves en los próximos años?`,
          advice:
            'Muestra ambición y deseos de crecimiento alineados con tu perfil actual.',
          answer: `Busco asumir más responsabilidades como perfil ${profile?.experienceLevel || 'avanzado'} y seguir contribuyendo al éxito de mis proyectos.`,
        },
      ],
    };
  }
}
