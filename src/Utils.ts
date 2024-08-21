export enum Colour {
  BLACK = "\u001b[30m",
  RED = "\u001b[31m",
  GREEN = "\u001b[32m",
  YELLOW = "\u001b[30m",
  BLUE = "\u001b[34m",
  MAGENTA = "\u001b[35m",
  CYAN = "\u001b[36m",
  WHITE = "\u001b[37m",
  NONE = "\u001b[0m",
}

export default class Utils {
  /**
   * Method used to pretty print information.
   * @param data Data to pretty print
   * @param start If the data is a collection we can specify the start character instead of { or [
   * @param end If the data is a collection we can specify the end character instead of } or ]
   * @returns
   */
  public static prettyPrint(
    data: any,
    start?: string,
    end?: string,
    prefix: string = ""
  ): string {
    let ret = "";
    if (Array.isArray(data)) {
      for (let item of data as any[]) {
        if (ret.length > 0) {
          ret += ", ";
        }
        ret += this.prettyPrint(item);
      }
      ret =
        (start || "[") +
        data.map((i) => Utils.prettyPrint(i)).join(", ") +
        (end || "]");
    } else if (data instanceof Set) {
      ret =
        (start || "{") +
        Array.from(data)
          .map((i) => Utils.prettyPrint(i))
          .join(", ") +
        (end || "}");
    } else {
      ret = data.toString();
    }

    return ret;
  }

  public static colourize(message: string, colour: Colour) {
    return `${colour}${message}${Colour.NONE}`;
  }
}
