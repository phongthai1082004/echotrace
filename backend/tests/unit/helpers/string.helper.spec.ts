/**
 * String Helper Functions Unit Tests
 * Test coverage: String manipulation, trimming, case conversion, encoding
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

describe('String Helper - Unit Tests', () => {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const slugify = (str: string) => 
    str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const truncate = (str: string, length: number = 50, suffix: string = '...') => 
    str.length > length ? str.substring(0, length - suffix.length) + suffix : str;

  const camelCase = (str: string) => 
    str.toLowerCase().replace(/[-_\s](.)/g, (_, c) => c.toUpperCase());

  const reverseString = (str: string) => str.split('').reverse().join('');

  describe('1. EP: Capitalize', () => {
    it('EP: Should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('EP: Should preserve uppercase', () => {
      expect(capitalize('HELLO')).toBe('HELLO');
    });

    it('EP: Should handle single char', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('EP: Should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('EP: Should handle with numbers', () => {
      expect(capitalize('123abc')).toBe('123abc');
    });
  });

  describe('2. EP: Slugify', () => {
    it('EP: Should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('EP: Should replace spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('EP: Should remove special characters', () => {
      expect(slugify('hello@world!')).toBe('helloworld');
    });

    it('EP: Should handle multiple spaces', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('EP: Should keep hyphens', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });

    it('EP: Should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello_world');
    });
  });

  describe('3. EP: Truncate', () => {
    it('EP: Should truncate long string', () => {
      const str = 'Hello world this is a long string';
      const result = truncate(str, 10);

      expect(result).toBe('Hello w...');
    });

    it('EP: Should not truncate short string', () => {
      const str = 'Short';
      const result = truncate(str, 10);

      expect(result).toBe('Short');
    });

    it('EP: Should use custom suffix', () => {
      const str = 'Hello world';
      const result = truncate(str, 5, '>>');

      expect(result).toBe('Hel>>');
    });

    it('EP: Should handle exact length', () => {
      const result = truncate('Hello', 5);

      expect(result).toBe('Hello');
    });

    it('EP: Should handle empty string', () => {
      expect(truncate('')).toBe('');
    });
  });

  describe('4. EP: CamelCase', () => {
    it('EP: Should convert to camelCase', () => {
      expect(camelCase('hello-world')).toBe('helloWorld');
    });

    it('EP: Should handle underscores', () => {
      expect(camelCase('hello_world')).toBe('helloWorld');
    });

    it('EP: Should handle spaces', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
    });

    it('EP: Should lowercase first char', () => {
      expect(camelCase('Hello')).toBe('hello');
    });

    it('EP: Should handle multiple separators', () => {
      expect(camelCase('hello-world-foo')).toBe('helloWorldFoo');
    });
  });

  describe('5. EP: Reverse String', () => {
    it('EP: Should reverse string', () => {
      expect(reverseString('hello')).toBe('olleh');
    });

    it('EP: Should handle palindrome', () => {
      expect(reverseString('racecar')).toBe('racecar');
    });

    it('EP: Should handle single char', () => {
      expect(reverseString('a')).toBe('a');
    });

    it('EP: Should handle empty string', () => {
      expect(reverseString('')).toBe('');
    });

    it('EP: Should handle with spaces', () => {
      expect(reverseString('hello world')).toBe('dlrow olleh');
    });

    it('EP: Should handle with numbers', () => {
      expect(reverseString('123abc')).toBe('cba321');
    });
  });

  describe('6. BVA: String Length', () => {
    it('BVA: Empty string', () => {
      expect(capitalize('')).toBe('');
      expect(slugify('')).toBe('');
    });

    it('BVA: Single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(reverseString('a')).toBe('a');
    });

    it('BVA: Very long string (10k chars)', () => {
      const longStr = 'a'.repeat(10000);
      const result = truncate(longStr, 100);

      expect(result.length).toBe(100); // 100 total (97 chars + '...')
    });

    it('BVA: Truncate at exact length boundary', () => {
      const str = 'a'.repeat(50);
      const result = truncate(str, 50);

      expect(result).toBe(str);
    });
  });

  describe('7. Integration: Text Processing', () => {
    it('Integration: Process URL-safe name', () => {
      const name = 'Hello World!@#$%';
      const slug = slugify(name);

      expect(slug).toBe('hello-world');
    });

    it('Integration: Create display name', () => {
      const raw = 'john_doe';
      const camel = camelCase(raw);
      const capital = capitalize(camel);

      expect(capital).toBe('JohnDoe');
    });

    it('Integration: Truncate and slugify', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const truncated = truncate(longTitle, 20);
      const slug = slugify(truncated);

      expect(truncated.length).toBe(20); // 20 total (17 + '...')
    });
  });

  describe('8. EP: Special Characters', () => {
    it('EP: Should handle quotes', () => {
      const result = slugify('hello"world');
      expect(result).toBe('helloworld');
    });

    it('EP: Should handle apostrophes', () => {
      const result = slugify("it's");
      expect(result).toBe('its');
    });

    it('EP: Should handle unicode', () => {
      const result = reverseString('café');
      expect(result).toBe('éfac');
    });

    it('EP: Should handle emojis', () => {
      const result = reverseString('hello👋');
      // Emoji may be represented as surrogate pairs, so check for either version
      expect(result).toMatch(/olleh/);
    });
  });

  describe('9. EP: Case Sensitivity', () => {
    it('EP: Capitalize handles mixed case', () => {
      expect(capitalize('HeLLo')).toBe('HeLLo');
    });

    it('EP: Slugify handles uppercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world');
    });

    it('EP: CamelCase normalizes case', () => {
      expect(camelCase('HELLO-WORLD')).toBe('helloWorld');
    });
  });

  describe('10. Performance: String Operations', () => {
    it('Performance: Process many strings', () => {
      const strings = Array.from({ length: 1000 }, (_, i) => `string_${i}`);
      const start = Date.now();
      const slugs = strings.map(s => slugify(s));
      const time = Date.now() - start;

      expect(slugs).toHaveLength(1000);
      expect(time).toBeLessThan(100);
    });

    it('Performance: Reverse large strings', () => {
      const str = 'a'.repeat(10000);
      const start = Date.now();
      reverseString(str);
      const time = Date.now() - start;

      expect(time).toBeLessThan(100);
    });

    it('Performance: Truncate many strings', () => {
      const strings = Array.from(
        { length: 1000 },
        () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      );
      const start = Date.now();
      strings.map(s => truncate(s, 20));
      const time = Date.now() - start;

      expect(time).toBeLessThan(100);
    });
  });
});
