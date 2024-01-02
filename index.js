import moment from "moment";
const prompt = require("prompt-sync")({ sigint: true });
import { kullaniciRandevulari, randevuAra, hekimAra, randevuAl, girisYap } from "./functions.js";

import { klinikler } from "./klinikler.json";
import { iller } from "./iller.json";

const tckimlik = prompt("TC kimlik numarası: ");
const sifre = prompt("Şifre: ");

let interval;

function kontrolEt(token, il, cinsiyet, klinik, baslangicTarihi, bitisTarihi) {

   const dateDiff = moment(bitisTarihi).diff(moment(baslangicTarihi), 'days');

   if (dateDiff > 15) {
      console.log("Maksimum 15 gün aralık belirtebilirsiniz");
      return;
   }

   kullaniciRandevulari(token).then(randevular => {
      if (randevular.aktifRandevuDtoList.filter(a => a.mhrsKlinikAdi == klinik.text).length <= 0) {
         randevuAra(token, il.plaka, cinsiyet, klinik.value, String(baslangicTarihi).format('YYYY-MM-DD HH:mm:ss'), String(bitisTarihi).format('YYYY-MM-DD HH:mm:ss')).then(veri => {
            hekimAra(token, il.plaka, cinsiyet, klinik.value, veri.kurumId, veri.hekimId).then(veri => {
               const kullanilabilirhekim = veri.filter(hekim => hekim.kalanKullanim > 0)
               if (kullanilabilirhekim.length > 0) {
                  const saatler = kullanilabilirhekim[0].hekimSlotList[0].muayeneYeriSlotList[0].saatSlotList.filter(saat => saat.bos == true)
                  const slotList = []
                  saatler.map(saat => {
                     saat.slotList.map(a => slotList.push(a))
                  })

                  const alinabilir = slotList.filter(a => a.bos == true)

                  randevuAl(token, alinabilir[0].slot.id, alinabilir[0].slot.fkCetvelId, alinabilir[0].slot.baslangicZamani, alinabilir[0].slot.bitisZamani)
                     .then(resp => {
                        console.log(`Randevu alındı\nHekim adı: ${resp.hekim.ad} ${resp.hekim.soyad}\nKurum adı: ${resp.kurum.kurumAdi} (${resp.kurum.ilAdi}-${resp.kurum.ilceAdi})\nRandevu tarihi: ${resp.randevuBaslangicZamaniStr.zaman} - ${resp.randevuBitisZamaniStr.saat}`)
                        clearInterval(interval)
                     }).catch(() => console.error("Randevu alınırken hata oluştu"))
               }
            }).catch(() => console.error("Hekim aranırken hata oluştu"))
         }).catch(err => {
            if (err.response.data.errors[0].kodu == "RND4010") console.log("Randevu bulunamadı")
            else console.error("Randevu bulunurken hata oluştu")
         })
      } else {
         console.log("Zaten randevu alınmış")
         clearInterval(interval)
      }
   }).catch(() => console.error("Randevu geçmişi alınırken hata oluştu"))
}

girisYap(tckimlik, sifre).then(rawtoken => {
   console.log("Giriş başarılı")

   const ilprompt = prompt("Randevu istediğiniz ilin adı veya plakası: ")
   let il;
   if (isNaN(Number(ilprompt))) il = iller.find(a => a.isim.toLowerCase().replaceAll(" ", "").includes(ilprompt.toLowerCase().replaceAll(" ", "")))
   else il = iller.find(a => a.plaka == ilprompt)
   if (!il) return console.log("Belirtilen il bulunamadı")
   console.log(`Seçilen il: ${il.plaka} plaka kodlu ${il.isim}`)
   const klinikprompt = prompt("Randevu istediğiniz kliniğin adı: ")
   const klinik = klinikler.find(a => a.text.toLowerCase().replaceAll(" ", "").includes(klinikprompt.toLowerCase().replaceAll(" ", "")))
   if (!klinik) return console.log("Belirtilen klinik bulunamadı")
   console.log(`Seçilen klinik: ${klinik.value} ID'li ${klinik.text}`)
   const cinsiyet = prompt("İstediğiniz cinsiyet (E/K/F): ").toUpperCase()
   if (cinsiyet != "E" && cinsiyet != "K" && cinsiyet != "F") return console.log("Geçersiz cinsiyet")
   const baslangicTarihi = prompt("Başlangıç tarihi (YYYY-MM-DD): ");
   const bitisTarihi = prompt("Bitiş tarihi (YYYY-MM-DD): ");

   const token = String("Bearer " + rawtoken.split('"')[1])
   console.log("Başladı, her 5 dakikada bir randevular kontrol edilecek")
   kontrolEt(token, il, cinsiyet, klinik, baslangicTarihi, bitisTarihi);

   interval = setInterval(() => {
      kontrolEt(token, il, cinsiyet, klinik, baslangicTarihi, bitisTarihi);
   }, 300000);

}).catch(() => console.error("Giriş başarısız"));
