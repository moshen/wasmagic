type StdioOverrideFunction = (
  stdioName: "stdout" | "stderr",
  text: string,
) => void;

export default StdioOverrideFunction;
