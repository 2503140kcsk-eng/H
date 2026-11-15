import type { PilotId } from "./pilots";
import type { PlanetId } from "./campaign";

export type StoryChoiceId = "follow-signal" | "protect-crew";

export interface StoryChoice {
  id: StoryChoiceId;
  label: string;
  consequence: string;
}

export interface StoryScene {
  key: string;
  title: string;
  speaker: string;
  prompt: string;
  choices: readonly StoryChoice[];
  selectedChoice: StoryChoiceId | null;
  response: string | null;
}

const SCENES: Readonly<Record<PilotId, Readonly<Record<PlanetId, Omit<StoryScene, "key" | "selectedChoice" | "response">>>>> = {
  "lumi-asteria": {
    "aurora-prime": {
      title: "第一章：星図にない声",
      speaker: "ルミ・アステリア",
      prompt: "星雲の奥から、まだ誰も記録していない救難信号が届く。任務を優先するか、それとも声の正体を追うか。",
      choices: [
        { id: "follow-signal", label: "信号の発信源を追う", consequence: "信号の奥に、ルミの家族が残した星図の断片が見つかった。" },
        { id: "protect-crew", label: "僚機の安全を優先する", consequence: "僚機を救ったことで、古い航路を知る整備士が仲間になった。" }
      ]
    },
    "pyra-reach": {
      title: "第二章：燃える航路",
      speaker: "ルミ・アステリア",
      prompt: "重力嵐の中で、星図の断片が二つの座標を示す。未知の信号か、救助ビーコンか。",
      choices: [
        { id: "follow-signal", label: "未知の座標へ進む", consequence: "星図が三つの惑星を結ぶ古代航路へ変化した。" },
        { id: "protect-crew", label: "救助ビーコンへ向かう", consequence: "救助した航海士から、古代航路の安全な抜け道を教わった。" }
      ]
    },
    "noctis-archive": {
      title: "最終章：星の記憶",
      speaker: "ルミ・アステリア",
      prompt: "アーカイブはルミにだけ応答し、最後の記録を開こうとしている。記録を解読するか、仲間と共有するか。",
      choices: [
        { id: "follow-signal", label: "記録の声に応える", consequence: "星図の欠落部分がつながり、隠された星環ルートが開いた。" },
        { id: "protect-crew", label: "仲間と記録を共有する", consequence: "失われた船団の記録が全員のものになり、帰還ルートが確定した。" }
      ]
    }
  },
  "noa-celeste": {
    "aurora-prime": {
      title: "第一章：観測者の約束",
      speaker: "ノア・セレステ",
      prompt: "星雲の異常波形は、かつてノアが設計した防壁の信号に似ている。危険を承知で解析するか、まず防壁を張るか。",
      choices: [
        { id: "follow-signal", label: "波形を直接解析する", consequence: "防壁の設計図に、ノアの知らない第四の層が記録されていた。" },
        { id: "protect-crew", label: "防壁で仲間を守る", consequence: "防壁が味方を認識し、僚機を守る新しい同期方式が生まれた。" }
      ]
    },
    "pyra-reach": {
      title: "第二章：重力の誤差",
      speaker: "ノア・セレステ",
      prompt: "重力剪断の波は、誰かが意図的に発生させている。発信源を追跡するか、先に避難路を確保するか。",
      choices: [
        { id: "follow-signal", label: "発信源を追跡する", consequence: "重力波の発信装置は、ノアの師が遺した観測端末だった。" },
        { id: "protect-crew", label: "避難路を確保する", consequence: "避難路に残された設計図から、防壁の弱点が判明した。" }
      ]
    },
    "noctis-archive": {
      title: "最終章：守るべき記録",
      speaker: "ノア・セレステ",
      prompt: "古代アーカイブは、記録を守る代わりに現在の船団の記憶を要求する。真実を受け入れるか、仲間の記憶を守るか。",
      choices: [
        { id: "follow-signal", label: "アーカイブの要求を受け入れる", consequence: "ノアは古代防壁の全設計を継承し、星環ルートの存在を知った。" },
        { id: "protect-crew", label: "仲間の記憶を守る", consequence: "記録は閉じられたが、船団の記憶は守られた。" }
      ]
    }
  },
  "rin-vega": {
    "aurora-prime": {
      title: "第一章：最短距離",
      speaker: "リン・ヴェガ",
      prompt: "星雲の奥に、誰も走破したことのない近道が見える。危険な近道へ突っ込むか、僚機と隊列を組むか。",
      choices: [
        { id: "follow-signal", label: "近道を突破する", consequence: "近道の先に、リンがかつて失ったエース機の識別信号が残っていた。" },
        { id: "protect-crew", label: "隊列を組んで進む", consequence: "僚機との連携で、最短距離より速い新しい編隊航法を見つけた。" }
      ]
    },
    "pyra-reach": {
      title: "第二章：追尾する影",
      speaker: "リン・ヴェガ",
      prompt: "重力嵐の追尾弾が、リンの旧式機の識別信号にだけ反応する。追跡を振り切るか、敵の懐へ飛び込むか。",
      choices: [
        { id: "follow-signal", label: "信号を逆探知する", consequence: "敵の追尾アルゴリズムを解析し、古代航路の座標を奪い返した。" },
        { id: "protect-crew", label: "囮になって仲間を逃がす", consequence: "僚機は無事に脱出し、リンは新しい連携ブーストを習得した。" }
      ]
    },
    "noctis-archive": {
      title: "最終章：最後の加速",
      speaker: "リン・ヴェガ",
      prompt: "アーカイブの最深部に、リンの旧式機が失われた日の記録がある。記録を追うか、今の仲間と未来へ進むか。",
      choices: [
        { id: "follow-signal", label: "過去の記録を追う", consequence: "失われた機体は星環ルートの門番として再構築されていた。" },
        { id: "protect-crew", label: "仲間と未来へ進む", consequence: "リンは過去を手放し、船団のエースとして新しい航路を選んだ。" }
      ]
    }
  }
};

export function getStoryChoiceKey(pilotId: string, planetId: string): string {
  return pilotId + ":" + planetId;
}

export function getStoryScene(
  pilotId: string,
  planetId: string,
  choices: Readonly<Record<string, string>>
): StoryScene | null {
  const pilot = (Object.keys(SCENES) as PilotId[]).find((id) => id === pilotId);
  if (!pilot) return null;
  const planet = (Object.keys(SCENES[pilot]) as PlanetId[]).find((id) => id === planetId);
  if (!planet) return null;
  const source = SCENES[pilot][planet];
  const key = getStoryChoiceKey(pilot, planet);
  const selectedChoice = source.choices.find((choice) => choice.id === choices[key])?.id ?? null;
  const response = selectedChoice
    ? source.choices.find((choice) => choice.id === selectedChoice)?.consequence ?? null
    : null;
  return { key, ...source, selectedChoice, response };
}

export function normalizeStoryChoices(value: Readonly<Record<string, unknown>>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const pilotId of Object.keys(SCENES) as PilotId[]) {
    for (const planetId of Object.keys(SCENES[pilotId]) as PlanetId[]) {
      const key = getStoryChoiceKey(pilotId, planetId);
      const candidate = value[key];
      if (candidate === "follow-signal" || candidate === "protect-crew") output[key] = candidate;
    }
  }
  return output;
}

export function hasSecretStarRoute(pilotId: string, choices: Readonly<Record<string, string>>): boolean {
  return (Object.keys(SCENES) as PilotId[]).includes(pilotId as PilotId) &&
    (["aurora-prime", "pyra-reach", "noctis-archive"] as const).every((planetId) =>
      choices[getStoryChoiceKey(pilotId, planetId)] === "follow-signal"
    );
}
