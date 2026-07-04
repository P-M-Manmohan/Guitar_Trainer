import { api } from "../api/api";

export const getChord = async (
  root: string,
  quality: string
) => {
  const response = await api.get(
    `/scale/${root}/${quality}`
  );

  return response.data;
};