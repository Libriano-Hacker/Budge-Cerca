import type { RequestPayload } from "./catalogApiTypes";
import { boundedText, recordWithKeys } from "./securityValidation";
import { validWhatsapp } from "./domain";
export function validRequest(value: unknown): value is RequestPayload {
  if (
    !recordWithKeys(
      value,
      ["kind", "neighborhood", "note"],
      [
        "businessId",
        "name",
        "category",
        "address",
        "description",
        "whatsapp",
        "field",
        "contactName",
        "contact",
      ],
    ) ||
    !["new", "correction"].includes(String(value.kind)) ||
    !boundedText(value.neighborhood, 1, 60) ||
    !boundedText(value.note, 10, 1000, true)
  )
    return false;
  if (
    value.contactName !== undefined &&
    !boundedText(value.contactName, 0, 100)
  )
    return false;
  if (
    value.contact !== undefined &&
    (!boundedText(value.contact, 0, 254) ||
      (value.contact !== "" &&
        !validWhatsapp(value.contact) &&
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.contact)))
  )
    return false;
  if (
    value.description !== undefined &&
    !boundedText(value.description, 0, 450, true)
  )
    return false;
  if (
    value.whatsapp !== undefined &&
    value.whatsapp !== "" &&
    !validWhatsapp(value.whatsapp as string)
  )
    return false;
  return value.kind === "new"
    ? boundedText(value.name, 1, 70) &&
        boundedText(value.category, 1, 50) &&
        boundedText(value.address, 1, 120) &&
        value.businessId === undefined &&
        value.field === undefined
    : boundedText(value.businessId, 1, 100) &&
        /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value.businessId) &&
        ["hours", "address", "contact", "other"].includes(
          String(value.field),
        ) &&
        ["name", "category", "address", "description", "whatsapp"].every(
          (key) => value[key] === undefined,
        );
}
