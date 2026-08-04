
import { GoogleGenAI, Type } from "@google/genai";
import { FixedAsset, InventoryItem, AppSettings, Contract, Supplier, ComputerUsageRecord } from "../types";

const getEffectiveApiKey = (settings?: AppSettings) => {
  return settings?.aiConfig?.apiKey?.trim() || process.env.API_KEY || (process as any).env?.GEMINI_API_KEY || '';
};

// AI 数据分析分析
export const analyzeData = async (
  assets: FixedAsset[], 
  inventory: InventoryItem[],
  settings: AppSettings
) => {
  const { provider, modelName, creativityLevel } = settings.aiConfig;
  const apiKey = getEffectiveApiKey(settings);

  if (!apiKey) {
    throw new Error("缺少 API Key。请在【系统设置 - AI模型配置】中填写 API Key 或检查环境变量配置。");
  }

  const dataContext = JSON.stringify({
    totalAssets: assets.length,
    totalInventoryItems: inventory.length,
    assetsSample: assets.slice(0, 10), 
    inventorySample: inventory.slice(0, 10)
  });

  const systemPrompt = `
    你是一个专业的企业资产管理顾问。
    请分析以下公司的固定资产和库存数据。
    请务必返回纯 JSON 格式数据。
    
    返回格式必须是一个数组，包含 3-5 个对象，每个对象结构如下：
    {
      "title": "简短的标题",
      "description": "详细的分析描述和建议",
      "severity": "low" | "medium" | "high",
      "type": "optimization" | "warning" | "info"
    }
  `;

  const userMessage = `数据内容: ${dataContext}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName || "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: creativityLevel ?? 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
              type: { type: Type.STRING, enum: ['optimization', 'warning', 'info'] }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI API Error:", error);
    throw error;
  }
};

/**
 * 供应商信息智能识别 - 极速模式优化
 */
export const parseSupplierInfo = async (text: string, settings: AppSettings) => {
  const apiKey = getEffectiveApiKey(settings);
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: settings?.aiConfig?.modelName || "gemini-3-flash-preview",
      contents: `提取此供应商文本信息：\n${text}`,
      config: {
        systemInstruction: `你是高效的数据提取器。仅返回以下JSON结构：
        {
          "name": "企业名",
          "address": "地址",
          "email": "邮箱",
          "bankName": "银行",
          "bankBranch": "支行",
          "bankAccount": "账号",
          "contacts": [{ "name": "姓名", "phone": "电话", "email": "邮箱" }]
        }
        无此项留空。严禁解释。`,
        responseMimeType: "application/json",
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};

/**
 * AI 视觉识别：从合同或发票图像中提取金额
 */
export const extractAmountFromImage = async (
  base64Data: string,
  mimeType: string,
  settings: AppSettings
): Promise<number | null> => {
  const apiKey = getEffectiveApiKey(settings);
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: settings?.aiConfig?.modelName || "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "请识别该合同原件或发票中的'合同总金额'或'价税合计金额'。只需要返回金额数字。如果找不到，返回 0。" }
        ],
      },
      config: { 
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const text = response.text || "";
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    return isNaN(amount) ? null : amount;
  } catch (error) {
    console.error("AI 视觉识别失败:", error);
    return null;
  }
};

export const chatWithAiAgent = async (
    query: string,
    contextData: {
        assets: FixedAsset[],
        inventory: InventoryItem[],
        contracts: Contract[],
        suppliers: Supplier[],
        records: ComputerUsageRecord[]
    },
    settings: AppSettings,
    history: {role: string, content: string}[] = []
) => {
    const apiKey = getEffectiveApiKey(settings);
    if (!apiKey) throw new Error("缺少 API Key 配置，请在【系统设置】中配置 AI API Key。");
  
    const systemPrompt = `你是一个集成了企业ERP系统的智能数据助手“资产管家AI”。\n数据上下文：${JSON.stringify({
        assetsCount: contextData.assets.length,
        inventoryCount: contextData.inventory.length,
        contractsCount: contextData.contracts.length,
        suppliersCount: contextData.suppliers.length
    })}`;
  
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
        model: settings?.aiConfig?.modelName || 'gemini-3-flash-preview',
        history: history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        })),
        config: { 
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingBudget: 0 } 
        }
    });
    const result = await chat.sendMessage({ message: query });
    return result.text;
}

/**
 * 测试 AI 接口连通性 (Ping)
 */
export const testAiConnection = async (settings: AppSettings): Promise<{ success: boolean; message: string }> => {
  const apiKey = getEffectiveApiKey(settings);
  if (!apiKey) {
    return { success: false, message: '未配置 API Key 密钥，请先填写 API Key' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: settings?.aiConfig?.modelName || "gemini-3-flash-preview",
      contents: "请返回简短的连通状态: API Connection Test OK!",
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    if (response && response.text) {
      return { success: true, message: `连接成功！响应: "${response.text.trim().slice(0, 50)}"` };
    } else {
      return { success: false, message: '接口连接成功，但模型返回内容为空' };
    }
  } catch (error: any) {
    console.error("AI Connection Test Error:", error);
    return { success: false, message: error.message || '网络或 API 密钥校验失败' };
  }
};
