type Server = {
  name: string;
  url: string;
};

export const SERVERS: Server[] = [
  {
    name: "Colab",
    url: process.env.NEXT_PUBLIC_COLAB_URL ?? ""
  },
  {
    name: "Kaggle",
    url: process.env.NEXT_PUBLIC_KAGGLE_URL ?? ""
  }
];
