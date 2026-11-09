/* =====================================================================================================
   ejemplo.js — Escenario de demostración del Lab de Redes 3D.
   Es un .drawio real (XML plano) y un documento de inventario; ambos entran por el MISMO pipeline que
   los archivos del usuario, así que sirven también como prueba viva de la ingesta.
   ===================================================================================================== */
(function (R3) {
  "use strict";

  R3.EJEMPLO_DRAWIO = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" type="device">
  <diagram id="campus" name="Campus · ejemplo">
    <mxGraphModel dx="1100" dy="760" grid="1" gridSize="10" page="1" pageWidth="1200" pageHeight="900">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="zA" value="Edificio A · Oficinas" style="swimlane;startSize=26;fillColor=#101a2c;strokeColor=#38bdf8;fontColor=#cbd5e1;" vertex="1" parent="1">
          <mxGeometry x="40" y="300" width="380" height="330" as="geometry" />
        </mxCell>
        <mxCell id="zB" value="Edificio B · Aulas" style="swimlane;startSize=26;fillColor=#101a2c;strokeColor=#a78bfa;fontColor=#cbd5e1;" vertex="1" parent="1">
          <mxGeometry x="560" y="300" width="380" height="330" as="geometry" />
        </mxCell>
        <mxCell id="internet" value="Internet" style="shape=cloud;fillColor=#1e293b;strokeColor=#94a3b8;" vertex="1" parent="1">
          <mxGeometry x="470" y="20" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="isp" value="Router ISP 203.0.113.1" style="fillColor=#0b1220;strokeColor=#94a3b8;" vertex="1" parent="1">
          <mxGeometry x="480" y="110" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="fg" value="FortiGate 200G 10.10.99.1" style="fillColor=#0b1220;strokeColor=#fb923c;" vertex="1" parent="1">
          <mxGeometry x="480" y="186" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="core" value="Core FS-148F 10.10.99.11" style="fillColor=#0b1220;strokeColor=#a78bfa;" vertex="1" parent="1">
          <mxGeometry x="480" y="262" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="srv" value="Servidores DNS/DHCP 10.10.60.10" style="fillColor=#0b1220;strokeColor=#f472b6;" vertex="1" parent="1">
          <mxGeometry x="480" y="500" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="swA" value="Switch A · Oficinas 10.10.99.12" style="fillColor=#0b1220;strokeColor=#38bdf8;" vertex="1" parent="zA">
          <mxGeometry x="140" y="60" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="pc1" value="PC Rectoría 10.10.10.21" style="fillColor=#0b1220;strokeColor=#60a5fa;" vertex="1" parent="zA">
          <mxGeometry x="40" y="150" width="110" height="44" as="geometry" />
        </mxCell>
        <mxCell id="pc2" value="PC Contabilidad 10.10.10.22" style="fillColor=#0b1220;strokeColor=#60a5fa;" vertex="1" parent="zA">
          <mxGeometry x="230" y="150" width="110" height="44" as="geometry" />
        </mxCell>
        <mxCell id="tel" value="Teléfono IP · Voz" style="fillColor=#0b1220;strokeColor=#fbbf24;" vertex="1" parent="zA">
          <mxGeometry x="40" y="240" width="110" height="44" as="geometry" />
        </mxCell>
        <mxCell id="swB" value="Switch B · Aulas 10.10.99.13" style="fillColor=#0b1220;strokeColor=#a78bfa;" vertex="1" parent="zB">
          <mxGeometry x="140" y="60" width="100" height="46" as="geometry" />
        </mxCell>
        <mxCell id="ap" value="AP Wi-Fi Aulas" style="fillColor=#0b1220;strokeColor=#22d3ee;" vertex="1" parent="zB">
          <mxGeometry x="40" y="150" width="110" height="44" as="geometry" />
        </mxCell>
        <mxCell id="cam" value="Cámara CCTV" style="fillColor=#0b1220;strokeColor=#fb7185;" vertex="1" parent="zB">
          <mxGeometry x="230" y="150" width="110" height="44" as="geometry" />
        </mxCell>
        <mxCell id="e1" value="WAN 1 Gbps" edge="1" parent="1" source="internet" target="isp" style="strokeColor=#94a3b8;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" value="203.0.113.0/30" edge="1" parent="1" source="isp" target="fg" style="strokeColor=#94a3b8;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" value="trunk 802.1Q" edge="1" parent="1" source="fg" target="core" style="strokeColor=#8b5cf6;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" value="trunk" edge="1" parent="1" source="core" target="swA" style="strokeColor=#38bdf8;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" value="trunk" edge="1" parent="1" source="core" target="swB" style="strokeColor=#a78bfa;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" value="VLAN 60" edge="1" parent="1" source="core" target="srv" style="strokeColor=#f472b6;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" value="VLAN 10" edge="1" parent="1" source="swA" target="pc1" style="strokeColor=#60a5fa;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" value="VLAN 10" edge="1" parent="1" source="swA" target="pc2" style="strokeColor=#60a5fa;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e9" value="VLAN 40 · PoE" edge="1" parent="1" source="swA" target="tel" style="strokeColor=#fbbf24;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e10" value="PoE · VLAN 30" edge="1" parent="1" source="swB" target="ap" style="strokeColor=#22d3ee;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e11" value="VLAN 50 · PoE" edge="1" parent="1" source="swB" target="cam" style="strokeColor=#fb7185;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  R3.EJEMPLO_DOC = {
    nombre: "inventario-ejemplo.txt",
    texto: [
      "INVENTARIO DE RED · EJEMPLO DE DEMOSTRACIÓN",
      "",
      "Perímetro: el FortiGate 200G (10.10.99.1) es la puerta de enlace y aplica las políticas entre VLANs.",
      "El enlace con el proveedor usa la red 203.0.113.0/30 y el Router ISP 203.0.113.1.",
      "Núcleo: Core FS-148F (10.10.99.11) concentra los troncales 802.1Q hacia los dos edificios.",
      "Edificio A: Switch A · Oficinas (10.10.99.12) atiende la VLAN 10 con el PC Rectoría 10.10.10.21 y el PC Contabilidad 10.10.10.22.",
      "La VLAN 40 se reserva para el Teléfono IP · Voz con PoE y prioridad QoS.",
      "Edificio B: Switch B · Aulas (10.10.99.13) alimenta el AP Wi-Fi Aulas por PoE en la VLAN 30 y la Cámara CCTV en la VLAN 50.",
      "Servidores: el equipo Servidores DNS/DHCP 10.10.60.10 centraliza el DHCP y el DNS de todas las VLANs.",
      "Gestión: la VLAN 99 (10.10.99.0/24) agrupa firewall, conmutadores y puntos de acceso."
    ].join("\n")
  };
})(window.R3 = window.R3 || {});
