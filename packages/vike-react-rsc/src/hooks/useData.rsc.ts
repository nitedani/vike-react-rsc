// vike-react-rsc/useData in the rsc env, e.g. imported by a server component
import { readPageContext } from "../rsc/scope";

export function useData<Data>(): Data {
  return readPageContext("useData()").data as Data;
}
