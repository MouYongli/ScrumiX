# Azure OpenAI Guidelines

## Overview

This document outlines the guidelines for using Azure OpenAI in the ScrumiX project.



## Using Azure OpenAI

Install the Azure Open AI SDK using pip (Requires: Python >=3.8):

```bash
pip install openai
```

```python
from azure.openai import OpenAI

client = OpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
)
``` 

### Chat Completions

** Legacy model version: This deployment is using legacy model gpt-4 version turbo-2024-04-09 which will be retired on 7/16/2025 local time. When the version retires, inferencing will return error responses and all deployments for this version will not be supported. To avoid disruptions, you can edit the deployment now to update the deployment to a supported version, if a new version is available. **

1. Run a basic code sample
This sample demonstrates a basic call to the chat completion API. The call is synchronous
```python
import os
from openai import AzureOpenAI

endpoint = "https://gpt-dbis.openai.azure.com/"
model_name = "gpt-4"
deployment = "gpt-4"

subscription_key = "<your-api-key>"
api_version = "2024-12-01-preview"

client = AzureOpenAI(
    api_version=api_version,
    azure_endpoint=endpoint,
    api_key=subscription_key,
)

response = client.chat.completions.create(
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant.",
        },
        {
            "role": "user",
            "content": "I am going to Paris, what should I see?",
        }
    ],
    max_tokens=4096,
    temperature=1.0,
    top_p=1.0,
    model=deployment
)

print(response.choices[0].message.content)
```

2. Explore more samples
Run a multi-turn conversation
This sample demonstrates a multi-turn conversation with the chat completion API. When using the model for a chat application, you'll need to manage the history of that conversation and send the latest messages to the model.

```python
import os
from openai import AzureOpenAI

endpoint = "https://gpt-dbis.openai.azure.com/"
model_name = "gpt-4"
deployment = "gpt-4"

subscription_key = "<your-api-key>"
api_version = "2024-12-01-preview"

client = AzureOpenAI(
    api_version=api_version,
    azure_endpoint=endpoint,
    api_key=subscription_key,
)

response = client.chat.completions.create(
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant.",
        },
        {
            "role": "user",
            "content": "I am going to Paris, what should I see?",
        },
        {
            "role": "assistant",
            "content": "Paris, the capital of France, is known for its stunning architecture, art museums, historical landmarks, and romantic atmosphere. Here are some of the top attractions to see in Paris:\n \n 1. The Eiffel Tower: The iconic Eiffel Tower is one of the most recognizable landmarks in the world and offers breathtaking views of the city.\n 2. The Louvre Museum: The Louvre is one of the world's largest and most famous museums, housing an impressive collection of art and artifacts, including the Mona Lisa.\n 3. Notre-Dame Cathedral: This beautiful cathedral is one of the most famous landmarks in Paris and is known for its Gothic architecture and stunning stained glass windows.\n \n These are just a few of the many attractions that Paris has to offer. With so much to see and do, it's no wonder that Paris is one of the most popular tourist destinations in the world.",
        },
        {
            "role": "user",
            "content": "What is so great about #1?",
        }
    ],
    max_tokens=4096,
    temperature=1.0,
    top_p=1.0,
    model=deployment
)

print(response.choices[0].message.content)
```

3. Stream the output
For a better user experience, you will want to stream the response of the model so that the first token shows up early and you avoid waiting for long responses.

```python
import os
from openai import AzureOpenAI

endpoint = "https://gpt-dbis.openai.azure.com/"
model_name = "gpt-4"
deployment = "gpt-4"

subscription_key = "<your-api-key>"
api_version = "2024-12-01-preview"

client = AzureOpenAI(
    api_version=api_version,
    azure_endpoint=endpoint,
    api_key=subscription_key,
)

response = client.chat.completions.create(
    stream=True,
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant.",
        },
        {
            "role": "user",
            "content": "I am going to Paris, what should I see?",
        }
    ],
    max_tokens=4096,
    temperature=1.0,
    top_p=1.0,
    model=deployment,
)

for update in response:
    if update.choices:
        print(update.choices[0].delta.content or "", end="")
client.close()
```

Available models:

* gpt-4
* gpt-4.1
* gpt-4.1-mini
* gpt-4o
* gpt-4o-mini
* o1
* o1-mini
* o3-mini
* o4-mini


### Embeddings

1. Run a basic code sample
This sample demonstrates a basic call to the chat completion API. The call is synchronous.

```python
import os
from openai import AzureOpenAI

endpoint = "https://gpt-dbis.openai.azure.com/"
model_name = "text-embedding-3-large"
deployment = "text-embedding-3-large"

api_version = "2024-02-01"

client = AzureOpenAI(
    api_version="2024-12-01-preview",
    endpoint=endpoint,
    credential=AzureKeyCredential("<API_KEY>")
)

response = client.embeddings.create(
    input=["first phrase","second phrase","third phrase"],
    model=deployment
)

for item in response.data:
    length = len(item.embedding)
    print(
        f"data[{item.index}]: length={length}, "
        f"[{item.embedding[0]}, {item.embedding[1]}, "
        f"..., {item.embedding[length-2]}, {item.embedding[length-1]}]"
    )
print(response.usage)
```
Available models:

* text-embedding-3-large


## Using Rest API

### Chat Completions

```bash
curl -X POST "https://gpt-dbis.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AZURE_API_KEY" \
    -d '{
        "messages": [
            {
                "role": "user",
                "content": "I am going to Paris, what should I see?"
            },
            {
                "role": "assistant",
                "content": "Paris, the capital of France, is known for its stunning architecture, art museums, historical landmarks, and romantic atmosphere. Here are some of the top attractions to see in Paris:\n \n 1. The Eiffel Tower: The iconic Eiffel Tower is one of the most recognizable landmarks in the world and offers breathtaking views of the city.\n 2. The Louvre Museum: The Louvre is one of the world's largest and most famous museums, housing an impressive collection of art and artifacts, including the Mona Lisa.\n 3. Notre-Dame Cathedral: This beautiful cathedral is one of the most famous landmarks in Paris and is known for its Gothic architecture and stunning stained glass windows.\n \n These are just a few of the many attractions that Paris has to offer. With so much to see and do, it's no wonder that Paris is one of the most popular tourist destinations in the world."
            },
            {
                "role": "user",
                "content": "What is so great about #1?"
            }
        ],
        "max_tokens": 4096,
        "temperature": 1,
        "top_p": 1,
        "model": "gpt-4"
    }'
```

### ASR
ASR is Automatic Speech Recognition.

Available models:
* whisper

Please refer to the [official documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text) for more information.

### TTS
TTS is Text-to-Speech.

Available models:
* tts
* tts-hd

Please refer to the [official documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech) for more information.

### Text-to-Image

Available models:   
* dall-e-3

```bash
curl -X POST "https://gpt-dbis.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AZURE_API_KEY" \
  -d '{
     "model": "dall-e-3",
     "prompt" : "A photograph of a red fox in an autumn forest",
     "size" : "1024x1024",
     "style" : "vivid",
     "quality" : "standard",
     "n" : 1
    }'
```



```bash
PASSWORD=$(openssl rand -base64 12)
echo $PASSWORD
sudo adduser <user_name>

sudo groupadd <group_name>
sudo usermod -aG <group_name> <user_name>
mkdir ~/newdir
sudo chmod -R 770 ~/newdir
sudo chgrp <group_name> ~/newdir
sudo chmod g+s ~/newdir
```

