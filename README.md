# openFAL-ts
openFAL-ts is a TypeScript implementation of FAL's (Ferrovie Appulo Lucane) private API's.  
**It is meant as a educational project and is not affiliated with FAL in any way.**

## Features
- It features great part of the endpoints of FAL's Android app.
- Written in TypeScript for type safety and better developer experience.

## Usage
### Installation
```bash
npm install github:reloia/openfal-ts
```

### Example
###
```typescript
import { FALClient } from "openfal-ts";

const client = new FALClient();

(async () => {
console.log(
  await client.getRTTrainTrips()
)
})();
```

