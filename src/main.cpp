#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "iPhone de gui";
const char* password = "12345678";
const char* mqtt_server = "broker.emqx.io"; // Usando URL oficial
const int mqtt_port = 1883;
const char* mqtt_topic = "unifeob/estacionamento/vagas";

WiFiClient espClient;
PubSubClient client(espClient);

const int trigPin = 5;
const int echoPin = 18;
const int ledVerde = 19;
const int ledVermelho = 21;
String ultimoStatus = "";

void setup_wifi() {
    delay(10);
    Serial.println("\n--- Conectando WiFi ---");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Conectado! IP: " + WiFi.localIP().toString());
}

void reconnect() {
    while (!client.connected()) {
        Serial.print("Tentando conexão MQTT...");
        // O ID precisa ser único para não derrubar o site
        String clientId = "ESP32_Vaga_A1_" + String(random(0, 999)); 
        if (client.connect(clientId.c_str())) {
            Serial.println("Conectado com sucesso!");
        } else {
            Serial.print("Falha rc=");
            Serial.print(client.state());
            Serial.println(" tentando em 2s...");
            delay(2000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
    pinMode(ledVerde, OUTPUT);
    pinMode(ledVermelho, OUTPUT);
    setup_wifi();
    client.setServer(mqtt_server, mqtt_port);
}

void loop() {
    if (!client.connected()) { reconnect(); }
    client.loop();

    digitalWrite(trigPin, LOW); delayMicroseconds(2);
    digitalWrite(trigPin, HIGH); delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    int distance = duration * 0.034 / 2;

    // Detecta se há algo a menos de 50cm
    String statusAtual = (distance > 0 && distance < 50) ? "ocupada" : "livre";

    if (statusAtual != ultimoStatus) {
        digitalWrite(ledVermelho, statusAtual == "ocupada" ? HIGH : LOW);
        digitalWrite(ledVerde, statusAtual == "livre" ? HIGH : LOW);

        String payload = "{\"id\":\"A1\", \"status\":\"" + statusAtual + "\"}";
        client.publish(mqtt_topic, payload.c_str());
        Serial.println("Enviado: " + payload);
        ultimoStatus = statusAtual;
    }
    delay(200);
}