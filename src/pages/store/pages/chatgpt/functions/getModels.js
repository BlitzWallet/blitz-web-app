import { AI_MODEL_COST } from "../constants/AIModelCost";

let cachedModels = null;

export async function getModels() {
  if (cachedModels) return cachedModels;
  try {
    const res = await fetch("https://api.ppq.ai/v1/models");
    const { data } = await res.json();
    cachedModels = data.map((model) => ({
      name: model.id,
      id: model.id,
      shortName: model.id,
      inputPrice: parseFloat(model.pricing?.input_per_1M_tokens || 0),
      outputPrice: parseFloat(model.pricing?.output_per_1M_tokens || 0),
    }));
    console.log(cachedModels);
    return cachedModels;
  } catch {
    return AI_MODEL_COST;
  }
}
