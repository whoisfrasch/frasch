#!/usr/bin/env ruby
# Fetches the security news feeds and writes them to _data/news.json.
# Runs on a schedule via .github/workflows/news.yml; the site then renders
# the headlines statically at build time — no client-side fetching.

require "net/http"
require "uri"
require "rexml/document"
require "json"
require "time"

FEEDS = [
  { name: "the hacker news",  url: "https://feeds.feedburner.com/TheHackersNews" },
  { name: "bleepingcomputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "project zero",     url: "https://googleprojectzero.blogspot.com/feeds/posts/default" }
].freeze

MAX_ITEMS = 8
OUTPUT = File.expand_path("../_data/news.json", __dir__)

def fetch(url, limit = 5)
  raise "too many redirects" if limit.zero?
  uri = URI(url)
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
                        open_timeout: 15, read_timeout: 20) do |http|
    req = Net::HTTP::Get.new(uri)
    req["User-Agent"] = "frasch-blog-news-fetcher (+https://whoisfrasch.github.io/frasch/)"
    http.request(req)
  end
  case res
  when Net::HTTPSuccess  then res.body
  when Net::HTTPRedirection then fetch(res["location"], limit - 1)
  else raise "HTTP #{res.code}"
  end
end

def parse_items(xml, source)
  doc = REXML::Document.new(xml)
  items = []

  # RSS 2.0
  doc.elements.each("//item") do |item|
    items << {
      "source" => source,
      "title"  => item.elements["title"]&.text.to_s.strip,
      "link"   => item.elements["link"]&.text.to_s.strip,
      "date"   => item.elements["pubDate"]&.text.to_s.strip
    }
  end

  # Atom
  doc.elements.each("//entry") do |entry|
    link = entry.get_elements("link").find { |l| l.attributes["rel"].nil? || l.attributes["rel"] == "alternate" }
    items << {
      "source" => source,
      "title"  => entry.elements["title"]&.text.to_s.strip,
      "link"   => link&.attributes&.[]("href").to_s.strip,
      "date"   => (entry.elements["published"] || entry.elements["updated"])&.text.to_s.strip
    }
  end

  items.reject { |i| i["title"].empty? || i["link"].empty? }
end

all = FEEDS.flat_map do |feed|
  parse_items(fetch(feed[:url]), feed[:name])
rescue StandardError => e
  warn "skipping #{feed[:name]}: #{e.message}"
  []
end

all.each do |i|
  i["date"] = begin
    Time.parse(i["date"]).utc.iso8601
  rescue StandardError
    nil
  end
end

all = all.sort_by { |i| i["date"] || "" }.reverse.first(MAX_ITEMS)

if all.empty?
  warn "all feeds failed — keeping existing #{OUTPUT}"
  exit 0
end

File.write(OUTPUT, JSON.pretty_generate({
  "updated" => Time.now.utc.iso8601,
  "items"   => all
}) + "\n")
puts "wrote #{all.size} items to #{OUTPUT}"
