import { C } from "../../lib/theme";

export const inputStyle = {
  width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`,
  borderRadius: "10px", padding: "10px 12px", color: C.text, fontSize: "14.5px", outline: "none",
};
export function TextInput(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
export function Select(props) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
export function TextArea(props) { return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: "64px", ...(props.style || {}) }} />; }
