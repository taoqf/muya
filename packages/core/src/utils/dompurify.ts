import type { Config } from 'dompurify';
import DOMPurify from 'dompurify';

const purify = DOMPurify();

export function isValidAttribute(attrName: string, attrValue: string, element: string): boolean {
	return purify.isValidAttribute(attrName, attrValue, element);
}

export { Config };

export default function sanitize(source: string | Node, config?: Config) {
	return purify.sanitize(source, config);
}
