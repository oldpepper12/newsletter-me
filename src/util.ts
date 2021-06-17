export namespace Util {
    export function replaceAll(target: string, query: string, withString: string) {
        while (true) {
            let newString = target.replace(query, withString);

            if (newString !== target) {
                target = newString;
            } else {
                return newString;
            }
        }
    }
}
